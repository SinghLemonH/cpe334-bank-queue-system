import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../data-source';
import { PasswordHasher } from '../password-hasher';

export async function runSeed(): Promise<void> {
  const dataSource = AppDataSource.isInitialized ? AppDataSource : await AppDataSource.initialize();

  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error('SEED_DEMO_PASSWORD environment variable is required for seeding');
  }

  const passwordHash = await PasswordHasher.hash(demoPassword);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const queues = [
      { code: 'D', name: 'Deposit & Withdrawal' },
      { code: 'L', name: 'Loans' },
      { code: 'O', name: 'Account Opening' },
    ];

    // New queues start open. Re-running the seed (the deploy job does on every release) keeps
    // each existing queue's is_open, so a queue an operator closed stays closed (F-08, NFR-04).
    for (const q of queues) {
      await queryRunner.query(
        `
        INSERT INTO queues (code, name, is_open)
        VALUES ($1, $2, true)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
      `,
        [q.code, q.name],
      );
    }

    const operators = [
      { username: 'teller1', displayName: 'Teller 1', queueCode: 'D' },
      { username: 'teller2', displayName: 'Teller 2', queueCode: 'D' },
      { username: 'loanofficer1', displayName: 'Loan Officer 1', queueCode: 'L' },
      { username: 'accountofficer1', displayName: 'Account Officer 1', queueCode: 'O' },
    ];

    for (const op of operators) {
      const userRes = await queryRunner.query(
        `
        INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
        VALUES ($1, $2, $3, 'OPERATOR', NULL)
        ON CONFLICT (username) DO UPDATE
        SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash
        RETURNING id;
      `,
        [op.username, passwordHash, op.displayName],
      );

      const userId = userRes[0].id;
      const queueRes = await queryRunner.query('SELECT id FROM queues WHERE code = $1;', [
        op.queueCode,
      ]);
      const queueId = queueRes[0].id;

      await queryRunner.query(
        `
        INSERT INTO operator_queue_assignment (operator_id, queue_id)
        VALUES ($1, $2)
        ON CONFLICT (operator_id, queue_id) DO NOTHING;
      `,
        [userId, queueId],
      );
    }

    const customers = [
      { username: 'customer1', displayName: 'Somchai (Senior)', dob: '1948-03-15' },
      { username: 'customer2', displayName: 'Somsak', dob: '1995-07-02' },
      { username: 'customer3', displayName: 'Wichai', dob: '2001-12-20' },
      { username: 'customer4', displayName: 'Pranee (Senior)', dob: '1950-09-09' },
    ];

    for (const cust of customers) {
      await queryRunner.query(
        `
        INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
        VALUES ($1, $2, $3, 'CUSTOMER', $4)
        ON CONFLICT (username) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            password_hash = EXCLUDED.password_hash,
            date_of_birth = EXCLUDED.date_of_birth;
      `,
        [cust.username, passwordHash, cust.displayName, cust.dob],
      );
    }

    await seedCounters(queryRunner);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
    if (require.main === module) {
      await dataSource.destroy();
    }
  }
}

/** Idempotent demo counters for Sprint 2 (F-07): D -> Counter 1/2, L -> Counter 3, O -> Counter 4. */
export async function seedCounters(queryRunner: { query: (sql: string, params?: unknown[]) => Promise<unknown> }): Promise<void> {
  const countersByQueue: Array<{ code: string; labels: string[] }> = [
    { code: 'D', labels: ['Counter 1', 'Counter 2'] },
    { code: 'L', labels: ['Counter 3'] },
    { code: 'O', labels: ['Counter 4'] },
  ];
  for (const group of countersByQueue) {
    for (const label of group.labels) {
      await queryRunner.query(
        `
        INSERT INTO counters (queue_id, label)
        SELECT id, $2 FROM queues WHERE code = $1
        ON CONFLICT (queue_id, label) DO NOTHING;
      `,
        [group.code, label],
      );
    }
  }
}

if (require.main === module) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
