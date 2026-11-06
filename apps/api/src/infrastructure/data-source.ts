import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Single source of database settings for the CLI (migrations, seed), the Nest app and tests.
 * Defaults match docker-compose.yml: dev DB on 5432 (queue_dev), test DB on 5433 (queue_test).
 */
export function getDataSourceOptions(isTest?: boolean): DataSourceOptions {
  const inTestEnv = isTest !== undefined ? isTest : process.env.NODE_ENV === 'test';
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: inTestEnv
      ? Number(process.env.DATABASE_PORT_TEST) || 5433
      : Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'queue',
    password: process.env.DATABASE_PASSWORD || 'queue',
    database: inTestEnv
      ? process.env.DATABASE_NAME_TEST || 'queue_test'
      : process.env.DATABASE_NAME || 'queue_dev',
    synchronize: false,
    ssl: process.env.DATABASE_SSL === 'true',
    entities: [__dirname + '/entities/*.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
  };
}

export const AppDataSource = new DataSource(getDataSourceOptions());
