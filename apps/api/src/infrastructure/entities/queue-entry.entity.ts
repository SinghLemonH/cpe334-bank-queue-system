import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntryStatus, Lane } from '../../domain/queue-entry';

/** Mapping of table `queue_entries` (migration 001). */
@Entity({ name: 'queue_entries' })
export class QueueEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'queue_id', type: 'uuid' })
  queueId!: string;

  @Column({ name: 'queue_date', type: 'date' })
  queueDate!: string;

  @Column({ type: 'int' })
  seq!: number;

  @Column({ name: 'display_number', type: 'text' })
  displayNumber!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'text', default: 'REGULAR' })
  lane!: Lane;

  @Column({ type: 'text', default: 'WAITING' })
  status!: EntryStatus;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId!: string | null;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @Column({ name: 'called_at', type: 'timestamptz', nullable: true })
  calledAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
