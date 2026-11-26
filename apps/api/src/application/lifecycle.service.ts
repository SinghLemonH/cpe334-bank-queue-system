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
import { nextStatus } from '../domain/entry-status';
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
