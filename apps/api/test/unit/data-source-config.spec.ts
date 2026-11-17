import { getDataSourceOptions, getSslOptions } from '../../src/infrastructure/data-source';

/** Cloud settings come only from the environment (Lab 5 R-02). */
describe('data-source configuration from environment', () => {
  const saved = { ...process.env };
  const keys = ['DATABASE_SSL', 'DATABASE_SSL_CA', 'DATABASE_SSL_REJECT_UNAUTHORIZED', 'DB_POOL_MAX'];

  beforeEach(() => {
    for (const k of keys) delete process.env[k];
  });

  afterAll(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('uses no TLS unless DATABASE_SSL=true (local Docker and CI)', () => {
    expect(getSslOptions()).toBe(false);
    process.env.DATABASE_SSL = 'false';
    expect(getSslOptions()).toBe(false);
  });

  it('verifies the server certificate by default when TLS is on', () => {
    process.env.DATABASE_SSL = 'true';
    expect(getSslOptions()).toEqual({ rejectUnauthorized: true });
  });

  it('uses DATABASE_SSL_CA (with escaped newlines) as the trusted CA', () => {
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_SSL_CA = '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----';
    expect(getSslOptions()).toEqual({
      ca: '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
      rejectUnauthorized: true,
    });
  });

  it('skips verification only when DATABASE_SSL_REJECT_UNAUTHORIZED=false', () => {
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'false';
    expect(getSslOptions()).toEqual({ rejectUnauthorized: false });
  });

  it('reads the pool size from DB_POOL_MAX and keeps 30 as the default (TEST-14 needs > 20)', () => {
    expect((getDataSourceOptions(true).extra as { max: number }).max).toBe(30);
    process.env.DB_POOL_MAX = '5';
    expect((getDataSourceOptions(true).extra as { max: number }).max).toBe(5);
  });
});
