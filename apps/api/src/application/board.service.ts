import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CLOCK_TOKEN, IClock } from '../common/clock';

export interface BoardNowServingItem {
  displayNumber: string;
  counterLabel: string | null;
  status: string;
  lane: string;
}

export interface BoardQueueItem {
  code: string;
  name: string;
  isOpen: boolean;
  waitingCount: number;
  nowServing: BoardNowServingItem[];
}

export interface BoardView {
  generatedAt: string;
  queues: BoardQueueItem[];
}

@Injectable()
export class BoardService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock,
  ) {}

  async getBoard(): Promise<BoardView> {
    const today = this.clock.today();

    const queues: Array<{ id: string; code: string; name: string; is_open: boolean }> =
      await this.dataSource.query(`SELECT id, code, name, is_open FROM queues ORDER BY code`);

    const waitingRows: Array<{ queue_id: string; cnt: string | number }> = await this.dataSource.query(
      `SELECT queue_id, count(*)::int AS cnt
       FROM queue_entries
       WHERE queue_date = $1 AND status = 'WAITING'
       GROUP BY queue_id`,
      [today],
    );
    const waitingMap = new Map<string, number>();
    for (const r of waitingRows) {
      waitingMap.set(r.queue_id, Number(r.cnt));
    }

    const servingRows: Array<{
      queue_id: string;
      display_number: string;
      status: string;
      lane: string;
      counter_label: string | null;
    }> = await this.dataSource.query(
      `SELECT e.queue_id, e.display_number, e.status, e.lane, c.label AS counter_label
       FROM queue_entries e
       LEFT JOIN counters c ON c.id = e.counter_id
       WHERE e.queue_date = $1 AND e.status IN ('CALLED', 'SERVING')
       ORDER BY e.called_at ASC`,
      [today],
    );

    const servingMap = new Map<string, BoardNowServingItem[]>();
    for (const r of servingRows) {
      const list = servingMap.get(r.queue_id) ?? [];
      list.push({
        displayNumber: r.display_number,
        counterLabel: r.counter_label ?? null,
        status: r.status,
        lane: r.lane,
      });
      servingMap.set(r.queue_id, list);
    }

    const queueItems: BoardQueueItem[] = queues.map((q) => ({
      code: q.code,
      name: q.name,
      isOpen: q.is_open === true,
      waitingCount: waitingMap.get(q.id) ?? 0,
      nowServing: servingMap.get(q.id) ?? [],
    }));

    return {
      generatedAt: this.clock.now().toISOString(),
      queues: queueItems,
    };
  }
}
