import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Mapping of table `queues` (migration 001). Schema changes only through migrations. */
@Entity({ name: 'queues' })
export class QueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  code!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'is_open', type: 'boolean', default: true })
  isOpen!: boolean;
}
