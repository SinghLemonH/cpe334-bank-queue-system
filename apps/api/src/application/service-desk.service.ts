import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CLOCK_TOKEN, IClock } from '../common/clock';
import {
  CounterBusyError,
  InvalidTransitionError,
  NoWaitingEntryError,
  NotEntryOwnerError,
  NotFoundError,
  OperatorBusyError,
  QueueNotAssignedError,
} from '../common/errors';
import { EntryAction, nextStatus, requiredStatus } from '../domain/entry-status';
import { parsePriorityStreakLimit } from '../domain/ordering/priority-ordering-policy';
import { CallContext, QUEUE_ORDERING_POLICY, QueueOrderingPolicy } from '../domain/ordering/queue-ordering-policy';
import { EntryStatus, Lane } from '../domain/queue-entry';
import { mapPgError } from '../infrastructure/pg-errors';
import { ENTRY_SELECT, EntryRow, EntryView, QueueSummary, toEntry, UUID_RE } from './queue.service';

/**
 * TypeORM's postgres driver returns `[rows, rowCount]` for UPDATE/DELETE and plain rows otherwise.
 */
function returnedRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as T[];
  }
  return result as T[];
}

/** F-03 operator service desk (contract docs/sprints/sprint-1/F-03-service-desk.md). */
@Injectable()
export class ServiceDeskService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock,
    @Inject(QUEUE_ORDERING_POLICY) private readonly policy: QueueOrderingPolicy,
  ) {}

  /** 4.1: assigned queues only, ordered by code, with today's waiting count. */
  async assignedQueues(operatorId: string): Promise<QueueSummary[]> {
    const rows: Array<{ code: string; name: string; is_open: boolean; waiting_count: number | string }> =
      await this.dataSource.query(
        `
        SELECT q.code, q.name, q.is_open,
               (
                 SELECT count(*)::int
                 FROM queue_entries e
                 WHERE e.queue_id = q.id AND e.queue_date = $2 AND e.status = 'WAITING'
               ) AS waiting_count
        FROM operator_queue_assignment a
        JOIN queues q ON q.id = a.queue_id
        WHERE a.operator_id = $1
        ORDER BY q.code
        `,
        [operatorId, this.clock.today()],
      );
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      isOpen: row.is_open === true,
      waitingCount: Number(row.waiting_count),
    }));
  }

  /** 4.2 / C-1: the CALLED or SERVING entry this operator holds today, or null. */
  async currentEntry(operatorId: string): Promise<{ entry: EntryView | null }> {
    const rows: EntryRow[] = await this.dataSource.query(
      `${ENTRY_SELECT}
       WHERE e.operator_id = $1 AND e.queue_date = $2 AND e.status IN ('CALLED', 'SERVING')
       ORDER BY e.called_at DESC
       LIMIT 1`,
      [operatorId, this.clock.today()],
    );
    return { entry: rows[0] ? toEntry(rows[0]) : null };
  }

  /** 4.3 / workflow 1.2: one transaction, FIFO with FOR UPDATE SKIP LOCKED (BR-03, BR-07, BR-13). */
  async callNext(operatorId: string, code: string, counterId?: string): Promise<EntryView> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const entry = await this.callNextInTransaction(queryRunner.manager, operatorId, code, counterId);
      await queryRunner.commitTransaction();
      return entry;
    } catch (err) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw mapPgError(err) ?? err;
    } finally {
      await queryRunner.release();
    }
  }

  /** 4.4: CALLED -> SERVING, caller only. */
  start(operatorId: string, id: string): Promise<EntryView> {
    return this.advance(operatorId, id, 'start', 'started_at');
  }

  /** 4.5: SERVING -> COMPLETED, caller only. */
  complete(operatorId: string, id: string): Promise<EntryView> {
    return this.advance(operatorId, id, 'complete', 'ended_at');
  }

  private async callNextInTransaction(
    manager: EntityManager,
    operatorId: string,
    code: string,
    counterId?: string,
  ): Promise<EntryView> {
    // 1. Queue exists (404). Lock the queue row so concurrent call-next calls on this queue
    //    serialize their recent-call streak reads and anti-starvation decisions (F-09, BR-14).
    const queues: Array<{ id: string }> = await manager.query(
      `SELECT id FROM queues WHERE code = $1 FOR UPDATE`,
      [code],
    );
    const queue = queues[0];
    if (!queue) throw new NotFoundError('This queue does not exist.');

    // 2. Operator is assigned (403 FORBIDDEN, BR-05).
    await this.assertAssigned(manager, operatorId, queue.id);

    // 3. counterId given and not a counter of this queue -> 404 NOT_FOUND (F-07 contract 4.1 step 4)
    if (counterId) {
      const counters: Array<{ id: string }> = await manager.query(
        `SELECT id FROM counters WHERE id = $1 AND queue_id = $2`,
        [counterId, queue.id],
      );
      if (counters.length === 0) {
        throw new NotFoundError('This counter does not exist in this queue.');
      }
    }

    // 4. Operator holds nothing today (409 OPERATOR_BUSY, BR-06). Earlier days do not count (E6).
    const queueDate = this.clock.today();
    const held: unknown[] = await manager.query(
      `SELECT 1 FROM queue_entries
       WHERE operator_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'SERVING')
       LIMIT 1`,
      [operatorId, queueDate],
    );
    if (held.length > 0) throw new OperatorBusyError('Finish your current customer before calling the next one.');

    // 5. counterId given and that counter has a CALLED/SERVING entry today -> 409 COUNTER_BUSY (BR-13)
    if (counterId) {
      const busy: unknown[] = await manager.query(
        `SELECT 1 FROM queue_entries
         WHERE counter_id = $1 AND queue_date = $2 AND status IN ('CALLED', 'SERVING')
         LIMIT 1`,
        [counterId, queueDate],
      );
      if (busy.length > 0) {
        throw new CounterBusyError('This counter is already serving a customer. Choose another counter.');
      }
    }

    // 6. Ask the ordering policy which lane to take from.
    const streakLimit = parsePriorityStreakLimit(process.env.PRIORITY_STREAK_LIMIT);
    const recentRows: Array<{ lane: Lane }> = await manager.query(
      `SELECT lane
       FROM queue_entries
       WHERE queue_id = $1 AND queue_date = $2 AND called_at IS NOT NULL
       ORDER BY called_at DESC, seq DESC
       LIMIT $3`,
      [queue.id, queueDate, streakLimit],
    );
    const flags: Array<{ regular: boolean; priority: boolean }> = await manager.query(
      `SELECT
         EXISTS (SELECT 1 FROM queue_entries WHERE queue_id = $1 AND queue_date = $2
                 AND status = 'WAITING' AND lane = 'REGULAR') AS regular,
         EXISTS (SELECT 1 FROM queue_entries WHERE queue_id = $1 AND queue_date = $2
                 AND status = 'WAITING' AND lane = 'PRIORITY') AS priority`,
      [queue.id, queueDate],
    );
    const ctx: CallContext = {
      recentCalledLanes: recentRows.map((row) => row.lane),
      waiting: { REGULAR: flags[0].regular === true, PRIORITY: flags[0].priority === true },
    };
    const lane = this.policy.chooseLane(ctx);
    if (lane === null) throw new NoWaitingEntryError('No customers are waiting in this queue.');

    // 7. Lock the lowest-seq WAITING entry; rows locked by a concurrent call are skipped.
    const params: unknown[] = [queue.id, queueDate];
    let laneFilter = '';
    if (lane !== 'ANY') {
      params.push(lane);
      laneFilter = 'AND lane = $3';
    }
    const candidates: Array<{ id: string }> = await manager.query(
      `SELECT id FROM queue_entries
       WHERE queue_id = $1 AND queue_date = $2 AND status = 'WAITING' ${laneFilter}
       ORDER BY seq
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      params,
    );
    const candidate = candidates[0];
    if (!candidate) throw new NoWaitingEntryError('No customers are waiting in this queue.');

    // 8. Conditional update to nextStatus('WAITING', 'call') = CALLED.
    //    A same-operator race hits uq_operator_active_entry -> OPERATOR_BUSY (mapPgError).
    //    A same-counter race hits uq_counter_active_entry -> COUNTER_BUSY (mapPgError).
    await manager.query(
      `UPDATE queue_entries
       SET status = 'CALLED', operator_id = $2, called_at = $3, counter_id = $4
       WHERE id = $1 AND status = 'WAITING'`,
      [candidate.id, operatorId, this.clock.now(), counterId ?? null],
    );
    return this.readEntry(manager, candidate.id);
  }

  /** Workflow 1.3: 404 -> 403 FORBIDDEN -> 403 NOT_ENTRY_OWNER -> 409 -> conditional update. */
  private async advance(
    operatorId: string,
    id: string,
    action: Exclude<EntryAction, 'call'>,
    timestampColumn: 'started_at' | 'ended_at',
  ): Promise<EntryView> {
    if (!UUID_RE.test(id)) throw new NotFoundError('This ticket does not exist.');
    const rows: Array<{ status: EntryStatus; operator_id: string | null; queue_id: string }> =
      await this.dataSource.query(`SELECT status, operator_id, queue_id FROM queue_entries WHERE id = $1`, [id]);
    const entry = rows[0];
    if (!entry) throw new NotFoundError('This ticket does not exist.');

    await this.assertAssigned(this.dataSource.manager, operatorId, entry.queue_id);
    if (entry.operator_id !== null && entry.operator_id !== operatorId) {
      throw new NotEntryOwnerError('Only the operator who called this ticket can serve it.');
    }

    const from = requiredStatus(action);
    const to = nextStatus(entry.status, action);
    const result = await this.dataSource.query(
      `UPDATE queue_entries
       SET status = $4, ${timestampColumn} = $5
       WHERE id = $1 AND status = $2 AND operator_id = $3
       RETURNING id`,
      [id, from, operatorId, to, this.clock.now()],
    );
    // 0 rows: the entry changed between the read and the update (e.g. a double click).
    if (returnedRows<{ id: string }>(result).length === 0) {
      throw new InvalidTransitionError('This ticket has already changed. Refresh and try again.');
    }
    return this.readEntry(this.dataSource.manager, id);
  }

  private async assertAssigned(manager: EntityManager, operatorId: string, queueId: string): Promise<void> {
    const assigned: unknown[] = await manager.query(
      `SELECT 1 FROM operator_queue_assignment WHERE operator_id = $1 AND queue_id = $2`,
      [operatorId, queueId],
    );
    if (assigned.length === 0) throw new QueueNotAssignedError();
  }

  private async readEntry(manager: EntityManager, id: string): Promise<EntryView> {
    const rows: EntryRow[] = await manager.query(`${ENTRY_SELECT} WHERE e.id = $1`, [id]);
    return toEntry(rows[0]);
  }
}
