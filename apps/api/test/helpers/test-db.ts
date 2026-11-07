import { DataSource } from 'typeorm';
import { getDataSourceOptions } from '../../src/infrastructure/data-source';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';

let testDataSourceInstance: DataSource | null = null;

export async function getTestDataSource(): Promise<DataSource> {
  if (testDataSourceInstance && testDataSourceInstance.isInitialized) {
    return testDataSourceInstance;
  }
  const options = getDataSourceOptions(true);
  testDataSourceInstance = new DataSource(options);
  await testDataSourceInstance.initialize();
  return testDataSourceInstance;
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.query(`
      TRUNCATE TABLE queue_entries, queue_daily_counter, operator_queue_assignment, sessions, users, queues CASCADE;
    `);
  } finally {
    await qr.release();
  }
}

export interface CreateTestUserOptions {
  username: string;
  role: 'CUSTOMER' | 'OPERATOR';
  displayName?: string;
  dob?: string;
  password?: string;
}

export async function createTestUser(
  dataSource: DataSource,
  opts: CreateTestUserOptions,
): Promise<{ id: string; username: string; role: string }> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  try {
    const password = opts.password || 'test_password_123';
    const passwordHash = await PasswordHasher.hash(password);
    const displayName = opts.displayName || opts.username;
    const dob = opts.role === 'CUSTOMER' ? opts.dob || '1990-01-01' : null;

    const res = await qr.query(
      `
      INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, role;
    `,
      [opts.username, passwordHash, displayName, opts.role, dob],
    );
    return res[0];
  } finally {
    await qr.release();
  }
}
