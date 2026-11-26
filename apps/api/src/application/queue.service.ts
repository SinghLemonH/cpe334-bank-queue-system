import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CLOCK_TOKEN, IClock } from '../common/clock';
import { DuplicateActiveEntryError, NotFoundError, QueueClosedError } from '../common/errors';
import { formatDisplayNumber } from '../domain/display-number';
import { DUPLICATE_ACTIVE_ENTRY_MESSAGE, peopleAheadValue } from '../domain/queue-entry';
import { mapPgError } from '../infrastructure/pg-errors';

export interface QueueSummary {
  code: string;
  name: string;
  isOpen: boolean;
  waitingCount: number;
}

/** Shared entry shape (contract README 3.4). Never includes customer or operator ids. */
export interface EntryView {
  id: string;
  queueCode: string;
  displayNumber: string;
  status: string;
  lane: string;
  counterLabel: string | null;
  peopleAhead: number | null;
  joinedAt: string;
  calledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface EntryRow {
  id: string;
  queue_code: string;
  display_number: string;
  status: string;
  lane: string;
  counter_label?: string | null;
  joined_at: Date | string;
  called_at: Date | string | null;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  people_ahead: number | string | null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ENTRY_SELECT = `
  SELECT e.id,
         q.code AS queue_code,
         e.display_number,
         e.status,
         e.lane,
         c.label AS counter_label,
         e.joined_at,
         e.called_at,
         e.started_at,
         e.ended_at,
         CASE
           WHEN e.status = 'WAITING' THEN (
             SELECT count(*)::int
             FROM queue_entries w
             WHERE w.queue_id = e.queue_id
               AND w.queue_date = e.queue_date
               AND w.status = 'WAITING'
               AND w.seq < e.seq
           )
           ELSE NULL
         END AS people_ahead
  FROM queue_entries e
  JOIN queues q ON q.id = e.queue_id
  LEFT JOIN counters c ON c.id = e.counter_id
`;

function iso(value: Date | string | null): string | null {
  if (value == null) return null;
  return new Date(value).toISOString();
}

export function toEntry(row: EntryRow): EntryView {
  const ahead = row.people_ahead == null ? null : Number(row.people_ahead);
  return {
    id: row.id,
    queueCode: row.queue_code,
    displayNumber: row.display_number,
    status: row.status,
    lane: row.lane,
    counterLabel: row.counter_label ?? null,
    peopleAhead: peopleAheadValue(row.status, ahead ?? 0),
    joinedAt: iso(row.joined_at) as string,
    calledAt: iso(row.called_at),
    startedAt: iso(row.started_at),
    endedAt: iso(row.ended_at),
  };
}

@Injectable()
export class QueueService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock,
  ) {}

  async listQueues(): Promise<QueueSummary[]> {
    const rows: Array<{ code: string; name: string; is_open: boolean; waiting_count: number | string }> =
      await this.dataSource.query(
        `
        SELECT q.code, q.name, q.is_open,
               (
                 SELECT count(*)::int
                 FROM queue_entries e
                 WHERE e.queue_id = q.id
                   AND e.queue_date = $1
                   AND e.status = 'WAITING'
               ) AS waiting_count
        FROM queues q
        ORDER BY q.code
        `,
        [this.clock.today()],
      );
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      isOpen: row.is_open === true,
      waitingCount: Number(row.waiting_count),
    }));
  }

  /**
   * Join one queue for the signed-in customer.
   * Every statement uses the transaction's EntityManager so the counter increment
   * and the entry insert share one connection (a second connection deadlocks TEST-14).
   */
  async join(customerId: string, code: string): Promise<EntryView> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    try {
      const entry = await this.joinInTransaction(manager, customerId, code);
      await queryRunner.commitTransaction();
      return entry;
    } catch (err) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw mapPgError(err) ?? err;
    } finally {
      await queryRunner.release();
    }
  }

  async myEntriesToday(customerId: string): Promise<EntryView[]> {
    const rows: EntryRow[] = await this.dataSource.query(
      `${ENTRY_SELECT}
       WHERE e.customer_id = $1 AND e.queue_date = $2
       ORDER BY e.joined_at ASC, e.seq ASC`,
      [customerId, this.clock.today()],
    );
    return rows.map(toEntry);
  }

  async getOwnEntry(customerId: string, id: string): Promise<EntryView> {
    if (!UUID_RE.test(id)) throw new NotFoundError();
    const rows: EntryRow[] = await this.dataSource.query(
      `${ENTRY_SELECT} WHERE e.id = $1 AND e.customer_id = $2`,
      [id, customerId],
    );
    if (!rows[0]) throw new NotFoundError();
    return toEntry(rows[0]);
  }

  private async joinInTransaction(manager: EntityManager, customerId: string, code: string): Promise<EntryView> {
    const queues: Array<{ id: string; code: string; is_open: boolean }> = await manager.query(
      `SELECT id, code, is_open FROM queues WHERE code = $1`,
      [code],
    );
    const queue = queues[0];
    if (!queue) throw new NotFoundError('This queue no longer exists.');
    if (queue.is_open !== true) {
      throw new QueueClosedError('This queue is closed. Please choose another service.');
    }

    const queueDate = this.clock.today();

    // BR-02 v2 (Lab 7 CR-01): one active entry per customer per day across ALL queues.
    // The per-queue unique index cannot see a join to another queue, so two joins from the
    // same customer on the same day are serialized with a transaction-scoped advisory lock.
    // Joins from different customers take different locks and still run in parallel (TEST-14).
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`join:${customerId}:${queueDate}`]);

    const active: Array<{ id: string }> = await manager.query(
      `
      SELECT id FROM queue_entries
      WHERE customer_id = $1 AND queue_date = $2
        AND status IN ('WAITING', 'CALLED', 'SERVING')
      LIMIT 1
      `,
      [customerId, queueDate],
    );
    if (active.length > 0) {
      throw new DuplicateActiveEntryError(DUPLICATE_ACTIVE_ENTRY_MESSAGE);
    }

    const counters: Array<{ last_seq: number | string }> = await manager.query(
      `
      INSERT INTO queue_daily_counter (queue_id, queue_date, last_seq)
      VALUES ($1, $2, 1)
      ON CONFLICT (queue_id, queue_date)
      DO UPDATE SET last_seq = queue_daily_counter.last_seq + 1
      RETURNING last_seq
      `,
      [queue.id, queueDate],
    );
    const seq = Number(counters[0].last_seq);
    const displayNumber = formatDisplayNumber(queue.code, seq);
    const joinedAt = this.clock.now();

    const inserted: Array<{ id: string }> = await manager.query(
      `
      INSERT INTO queue_entries
        (queue_id, queue_date, seq, display_number, customer_id, lane, status, operator_id, joined_at)
      VALUES ($1, $2, $3, $4, $5, 'REGULAR', 'WAITING', NULL, $6)
      RETURNING id
      `,
      [queue.id, queueDate, seq, displayNumber, customerId, joinedAt],
    );

    const rows: EntryRow[] = await manager.query(`${ENTRY_SELECT} WHERE e.id = $1`, [inserted[0].id]);
    return toEntry(rows[0]);
  }
}
