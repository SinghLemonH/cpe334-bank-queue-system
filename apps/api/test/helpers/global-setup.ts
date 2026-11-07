import { DataSource } from 'typeorm';
import { getDataSourceOptions } from '../../src/infrastructure/data-source';

/**
 * Runs once before all test files: apply migrations to the test database
 * (the test container keeps its data in tmpfs, so it starts empty).
 */
export default async function globalSetup(): Promise<void> {
  const dataSource = new DataSource(getDataSourceOptions(true));
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
