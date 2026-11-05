import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../data-source';

export async function resetDatabase(): Promise<void> {
  const dataSource = AppDataSource.isInitialized ? AppDataSource : await AppDataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.query(`
      TRUNCATE TABLE queue_entries, queue_daily_counter, operator_queue_assignment, sessions, users, queues CASCADE;
    `);
  } finally {
    await queryRunner.release();
    if (require.main === module) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database tables truncated successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
