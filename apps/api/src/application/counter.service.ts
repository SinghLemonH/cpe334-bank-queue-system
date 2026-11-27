import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotFoundError, QueueNotAssignedError } from '../common/errors';

export interface CounterItem {
  id: string;
  label: string;
}

@Injectable()
export class CounterService {
  constructor(private readonly dataSource: DataSource) {}

  async listForQueue(operatorId: string, queueCode: string): Promise<CounterItem[]> {
    const queues: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id FROM queues WHERE code = $1`,
      [queueCode],
    );
    const queue = queues[0];
    if (!queue) throw new NotFoundError('This queue does not exist.');

    const assignments: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM operator_queue_assignment WHERE operator_id = $1 AND queue_id = $2 LIMIT 1`,
      [operatorId, queue.id],
    );
    if (assignments.length === 0) {
      throw new QueueNotAssignedError();
    }

    const rows: CounterItem[] = await this.dataSource.query(
      `SELECT id, label FROM counters WHERE queue_id = $1 ORDER BY label`,
      [queue.id],
    );
    return rows;
  }
}
