import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';

export function getDataSourceOptions(isTest?: boolean): DataSourceOptions {
  const inTestEnv = isTest !== undefined ? isTest : process.env.NODE_ENV === 'test';
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgrespassword',
    database: inTestEnv
      ? process.env.DATABASE_NAME_TEST || 'queue_system_test'
      : process.env.DATABASE_NAME || 'queue_system',
    synchronize: false,
    ssl: process.env.DATABASE_SSL === 'true',
    entities: [__dirname + '/entities/*.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
  };
}

export const AppDataSource = new DataSource(getDataSourceOptions());
