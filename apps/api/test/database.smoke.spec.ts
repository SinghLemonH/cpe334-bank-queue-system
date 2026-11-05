import { DataSource } from 'typeorm';
import { getTestDataSource, clearDatabase } from './helpers/test-db';
import { runSeed } from '../src/infrastructure/seed/seed';

describe('Database and Migration Smoke Verification', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SEED_DEMO_PASSWORD = 'test_demo_password';
    dataSource = await getTestDataSource();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should have all 6 core tables present in the database', async () => {
    const tables: Array<{ tablename: string }> = await dataSource.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'sessions', 'queues', 'operator_queue_assignment', 'queue_daily_counter', 'queue_entries');
    `);

    const tableNames = tables.map((t) => t.tablename);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('queues');
    expect(tableNames).toContain('operator_queue_assignment');
    expect(tableNames).toContain('queue_daily_counter');
    expect(tableNames).toContain('queue_entries');
  });

  it('should have partial unique indexes registered on queue_entries', async () => {
    const indexes: Array<{ indexname: string; indexdef: string }> = await dataSource.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'queue_entries'
      AND indexname IN ('uq_active_entry_per_customer', 'uq_operator_active_entry');
    `);

    const indexNames = indexes.map((i) => i.indexname);
    expect(indexNames).toContain('uq_active_entry_per_customer');
    expect(indexNames).toContain('uq_operator_active_entry');

    const customerIdx = indexes.find((i) => i.indexname === 'uq_active_entry_per_customer');
    expect(customerIdx?.indexdef).toContain('WHERE');
    expect(customerIdx?.indexdef).toContain('WAITING');

    const operatorIdx = indexes.find((i) => i.indexname === 'uq_operator_active_entry');
    expect(operatorIdx?.indexdef).toContain('WHERE');
    expect(operatorIdx?.indexdef).toContain('CALLED');
  });

  it('should have row level security enabled on all project tables', async () => {
    const rlsTables: Array<{ tablename: string; rowsecurity: boolean }> = await dataSource.query(`
      SELECT tablename, rowsecurity FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('users', 'sessions', 'queues', 'operator_queue_assignment', 'queue_daily_counter', 'queue_entries', 'typeorm_migrations');
    `);

    for (const row of rlsTables) {
      expect(row.rowsecurity).toBe(true);
    }
  });

  it('should run seed idempotently without throwing duplicate errors', async () => {
    await clearDatabase(dataSource);
    await runSeed();
    await expect(runSeed()).resolves.not.toThrow();

    const queues = await dataSource.query('SELECT count(*) as count FROM queues;');
    expect(Number(queues[0].count)).toBe(3);

    const operators = await dataSource.query("SELECT count(*) as count FROM users WHERE role = 'OPERATOR';");
    expect(Number(operators[0].count)).toBe(4);

    const customers = await dataSource.query("SELECT count(*) as count FROM users WHERE role = 'CUSTOMER';");
    expect(Number(customers[0].count)).toBe(4);
  });
});
