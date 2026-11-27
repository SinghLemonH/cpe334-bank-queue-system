import { MigrationInterface, QueryRunner } from 'typeorm';

export class Counters1732600000000 implements MigrationInterface {
  name = 'Counters1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE counters (
        id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id uuid NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
        label    text NOT NULL CHECK (length(label) BETWEEN 1 AND 40),
        CONSTRAINT uq_counter_label UNIQUE (queue_id, label)
      );

      ALTER TABLE queue_entries ADD COLUMN counter_id uuid NULL REFERENCES counters(id) ON DELETE SET NULL;

      CREATE UNIQUE INDEX uq_counter_active_entry
        ON queue_entries (counter_id, queue_date)
        WHERE status IN ('CALLED', 'SERVING') AND counter_id IS NOT NULL;

      ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_counter_active_entry;
      ALTER TABLE queue_entries DROP COLUMN IF EXISTS counter_id;
      DROP TABLE IF EXISTS counters;
    `);
  }
}
