import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Mapping of table `queue_daily_counter` (migration 001). One row per queue per Bangkok date. */
@Entity({ name: 'queue_daily_counter' })
export class QueueDailyCounterEntity {
  @PrimaryColumn({ name: 'queue_id', type: 'uuid' })
  queueId!: string;

  @PrimaryColumn({ name: 'queue_date', type: 'date' })
  queueDate!: string;

  @Column({ name: 'last_seq', type: 'int' })
  lastSeq!: number;
}
