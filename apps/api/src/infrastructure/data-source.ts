import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import type { TlsOptions } from 'tls';

/**
 * TLS settings for the database connection, all from the environment:
 * - DATABASE_SSL=false (default): no TLS (local Docker, CI).
 * - DATABASE_SSL=true: TLS with certificate verification against Node's CA store.
 * - DATABASE_SSL_CA: PEM text of the provider's CA (e.g. Supabase root CA); verification stays on.
 * - DATABASE_SSL_REJECT_UNAUTHORIZED=false: encrypt but skip verification (last resort; document why).
 */
export function getSslOptions(): false | TlsOptions {
  if (process.env.DATABASE_SSL !== 'true') return false;
  const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
  return {
    ...(ca ? { ca } : {}),
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

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
    ssl: getSslOptions(),
    // TEST-14 fires 20 joins at once. Each holds one connection for its transaction,
    // so the pool must be larger than the default (10) or those requests deadlock.
    // Cloud Run sets DB_POOL_MAX lower (e.g. 5) because the Supabase pooler limits connections.
    extra: { max: Number(process.env.DB_POOL_MAX) || 30 },
    entities: [__dirname + '/entities/*.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
  };
}

export const AppDataSource = new DataSource(getDataSourceOptions());
