import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitMigration1730800000000 implements MigrationInterface {
  name = 'InitMigration1730800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username      text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        display_name  text NOT NULL,
        role          text NOT NULL CHECK (role IN ('CUSTOMER','OPERATOR')),
        date_of_birth date NULL,
        created_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_customer_dob CHECK (role <> 'CUSTOMER' OR date_of_birth IS NOT NULL)
      );

      CREATE TABLE sessions (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_sessions_user ON sessions (user_id);

      CREATE TABLE queues (
        id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code    text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]$'),
        name    text NOT NULL,
        is_open boolean NOT NULL DEFAULT true
      );

      CREATE TABLE operator_queue_assignment (
        operator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        queue_id    uuid NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
        PRIMARY KEY (operator_id, queue_id)
      );

      CREATE TABLE queue_daily_counter (
        queue_id   uuid NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
        queue_date date NOT NULL,
        last_seq   integer NOT NULL CHECK (last_seq >= 0),
        PRIMARY KEY (queue_id, queue_date)
      );

      CREATE TABLE queue_entries (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_id       uuid NOT NULL REFERENCES queues(id),
        queue_date     date NOT NULL,
        seq            integer NOT NULL CHECK (seq > 0),
        display_number text NOT NULL,
        customer_id    uuid NOT NULL REFERENCES users(id),
        lane           text NOT NULL DEFAULT 'REGULAR' CHECK (lane IN ('REGULAR','PRIORITY')),
        status         text NOT NULL DEFAULT 'WAITING'
                       CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','CANCELLED','NO_SHOW','EXPIRED')),
        operator_id    uuid NULL REFERENCES users(id),
        joined_at      timestamptz NOT NULL DEFAULT now(),
        called_at      timestamptz NULL,
        started_at     timestamptz NULL,
        ended_at       timestamptz NULL,
        CONSTRAINT uq_entry_number UNIQUE (queue_id, queue_date, seq),
        CONSTRAINT ck_operator_required
          CHECK (status IN ('WAITING','CANCELLED','EXPIRED') OR operator_id IS NOT NULL)
      );

      CREATE UNIQUE INDEX uq_active_entry_per_customer
        ON queue_entries (queue_id, queue_date, customer_id)
        WHERE status IN ('WAITING','CALLED','SERVING');

      CREATE UNIQUE INDEX uq_operator_active_entry
        ON queue_entries (operator_id, queue_date)
        WHERE status IN ('CALLED','SERVING');

      CREATE INDEX ix_waiting ON queue_entries (queue_id, queue_date, lane, seq)
        WHERE status = 'WAITING';

      CREATE INDEX ix_entries_customer ON queue_entries (customer_id, queue_date);

      ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sessions                  ENABLE ROW LEVEL SECURITY;
      ALTER TABLE queues                    ENABLE ROW LEVEL SECURITY;
      ALTER TABLE operator_queue_assignment ENABLE ROW LEVEL SECURITY;
      ALTER TABLE queue_daily_counter       ENABLE ROW LEVEL SECURITY;
      ALTER TABLE queue_entries             ENABLE ROW LEVEL SECURITY;
      ALTER TABLE typeorm_migrations        ENABLE ROW LEVEL SECURITY;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS queue_entries CASCADE;
      DROP TABLE IF EXISTS queue_daily_counter CASCADE;
      DROP TABLE IF EXISTS operator_queue_assignment CASCADE;
      DROP TABLE IF EXISTS queues CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
  }
}
