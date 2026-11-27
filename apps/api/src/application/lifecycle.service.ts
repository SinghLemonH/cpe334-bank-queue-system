import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CLOCK_TOKEN, IClock } from '../common/clock';
import {
  InvalidTransitionError,
  NoShowTooEarlyError,
  NotEntryOwnerError,
  NotFoundError,
  QueueNotAssignedError,
} from '../common/errors';
import { allowedFrom, nextStatus } from '../domain/entry-status';
import { isNoShowAllowed, parseGraceMinutes } from '../domain/no-show-rule';
import { EntryStatus } from '../domain/queue-entry';
import { ENTRY_SELECT, EntryRow, EntryView, QueueSummary, toEntry, UUID_RE } from './queue.service';

/** TypeORM's postgres driver returns `[rows, rowCount]` for UPDATE and plain rows otherwise. */
function returnedRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as T[];
  }
  return result as T[];
}

const CHANGED = 'This ticket has already changed. Refresh and try again.';

export interface EndDayResult {
  queue: QueueSummary;
  expiredCount: number;
}

/**
 * Sprint 2 transitions into terminal statuses and queue administration
 * (docs/sprints/sprint-2/README.md 4.2 F-04, 4.3 F-05, 4.6 F-08).
 * Every state change is a conditional UPDATE; 0 rows -> 409 INVALID_TRANSITION.
 */
@Injectable()
export class LifecycleService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock,
  ) {}

  /** F-04: the owner cancels their own WAITING or CALLED entry (BR-11, D-07, D-17). */
  async cancel(customerId: string, id: string): Promise<EntryView> {
    if (!UUID_RE.test(id)) throw new NotFoundError('This ticket does not exist.');
    const rows: Array<{ status: EntryStatus }> = await this.dataSource.query(
      `SELECT status FROM queue_entries WHERE id = $1 AND customer_id = $2`,
      [id, customerId],
    );
    // Another customer's entry is indistinguishable from a missing one (D-07).
    if (!rows[0]) throw new NotFoundError('This ticket does not exist.');
    const to = nextStatus(rows[0].status, 'cancel');

    const result = await this.dataSource.query(
      `UPDATE queue_entries SET status = $3, ended_at = $4
       WHERE id = $1 AND customer_id = $2 AND status = ANY($5::text[])
       RETURNING id`,
      [id, customerId, to, this.clock.now(), allowedFrom('cancel')],
    );
    if (returnedRows(result).length === 0) {
      throw new InvalidTransitionError('This ticket can no longer be cancelled. The page has been refreshed.');
    }
    return this.readEntry(this.dataSource.manager, id);
  }

  /** F-05: CALLED -> NO_SHOW by the calling operator after the grace period (BR-07, BR-12). */
  async noShow(operatorId: string, id: string): Promise<EntryView> {
    if (!UUID_RE.test(id)) throw new NotFoundError('This ticket does not exist.');
    const rows: Array<{ status: EntryStatus; operator_id: string | null; queue_id: string; called_at: Date | null }> =
      await this.dataSource.query(
        `SELECT status, operator_id, queue_id, called_at FROM queue_entries WHERE id = $1`,
        [id],
      );
    const entry = rows[0];
    if (!entry) throw new NotFoundError('This ticket does not exist.');

    await this.assertAssigned(this.dataSource.manager, operatorId, entry.queue_id);
    if (entry.operator_id !== null && entry.operator_id !== operatorId) {
      throw new NotEntryOwnerError('Only the operator who called this ticket can mark it as a no-show.');
    }
    const to = nextStatus(entry.status, 'noShow');

    const now = this.clock.now();
    const graceMinutes = parseGraceMinutes(process.env.NO_SHOW_GRACE_MINUTES);
    if (!entry.called_at || !isNoShowAllowed(new Date(entry.called_at), now, graceMinutes)) {
      throw new NoShowTooEarlyError();
    }

    const result = await this.dataSource.query(
      `UPDATE queue_entries SET status = $3, ended_at = $4
       WHERE id = $1 AND status = 'CALLED' AND operator_id = $2
       RETURNING id`,
      [id, operatorId, to, now],
    );
    if (returnedRows(result).length === 0) throw new InvalidTransitionError(CHANGED);
    return this.readEntry(this.dataSource.manager, id);
  }

  /** F-08: open or close an assigned queue (BR-09). Idempotent. */
  async setOpen(operatorId: string, code: string, isOpen: boolean): Promise<QueueSummary> {
    const queueId = await this.assignedQueueId(this.dataSource.manager, operatorId, code, false);
    await this.dataSource.query(`UPDATE queues SET is_open = $2 WHERE id = $1`, [queueId, isOpen]);
    return this.summary(this.dataSource.manager, queueId);
  }

  /**
   * F-08: end of day (BR-16, D-27). One transaction: lock the queue row, close the queue, and
   * expire today's WAITING and CALLED entries. SERVING and earlier-day entries are not touched.
   */
  async endDay(operatorId: string, code: string): Promise<EndDayResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const queueId = await this.assignedQueueId(manager, operatorId, code, true);
      await manager.query(`UPDATE queues SET is_open = false WHERE id = $1`, [queueId]);
      const result = await manager.query(
        `UPDATE queue_entries SET status = 'EXPIRED', ended_at = $3
         WHERE queue_id = $1 AND queue_date = $2 AND status = ANY($4::text[])
         RETURNING id`,
        [queueId, this.clock.today(), this.clock.now(), allowedFrom('expire')],
      );
      const queue = await this.summary(manager, queueId);
      await queryRunner.commitTransaction();
      return { queue, expiredCount: returnedRows(result).length };
    } catch (err) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** 404 for an unknown queue code, then 403 FORBIDDEN when the queue is not assigned (BR-05). */
  private async assignedQueueId(
    manager: EntityManager,
    operatorId: string,
    code: string,
    lock: boolean,
  ): Promise<string> {
    const queues: Array<{ id: string }> = await manager.query(
      `SELECT id FROM queues WHERE code = $1${lock ? ' FOR UPDATE' : ''}`,
      [code],
    );
    if (!queues[0]) throw new NotFoundError('This queue does not exist.');
    await this.assertAssigned(manager, operatorId, queues[0].id);
    return queues[0].id;
  }

  private async summary(manager: EntityManager, queueId: string): Promise<QueueSummary> {
    const rows: Array<{ code: string; name: string; is_open: boolean; waiting_count: number | string }> =
      await manager.query(
        `SELECT q.code, q.name, q.is_open,
                (SELECT count(*)::int FROM queue_entries e
                 WHERE e.queue_id = q.id AND e.queue_date = $2 AND e.status = 'WAITING') AS waiting_count
         FROM queues q WHERE q.id = $1`,
        [queueId, this.clock.today()],
      );
    const row = rows[0];
    return { code: row.code, name: row.name, isOpen: row.is_open === true, waitingCount: Number(row.waiting_count) };
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
