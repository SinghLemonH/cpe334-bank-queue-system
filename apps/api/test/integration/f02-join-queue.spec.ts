import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { clearDatabase, createTestUser, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';

/**
 * F-02 Join queue & my ticket.
 * Red commit: TEST-11 only (AC-11 / BR-02). The route is not implemented yet,
 * so this test must fail before the feature commit.
 * Contract: docs/sprints/sprint-1/F-02-join-queue.md, STS 2.2.
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';

describe('F-02 Join queue (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let c1: { id: string };

  beforeAll(async () => {
    db = await getTestDataSource();
    ({ app, clock } = await createTestApp());
  });

  beforeEach(async () => {
    clock.setTime(DEFAULT_TEST_TIME);
    await clearDatabase(db);
    c1 = await createTestUser(db, { username: 'c1', role: 'CUSTOMER', displayName: 'Customer One', password: PASSWORD });
    await db.query(
      `INSERT INTO queues (code, name, is_open) VALUES
         ('D', 'Deposit & Withdrawal', true),
         ('L', 'Loans', true),
         ('O', 'Account Opening', true)`,
    );
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  const server = () => app.getHttpServer();

  async function login(username = 'c1'): Promise<string> {
    const res = await request(server()).post('/api/auth/login').send({ username, password: PASSWORD }).expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    expect(sid).toBeDefined();
    return sid as string;
  }

  it('TEST-11 / AC-11: rejects second active entry for same customer and queue', async () => {
    const queue = await db.query(`SELECT id FROM queues WHERE code = 'D'`);
    const queueId = queue[0].id as string;
    await db.query(
      `INSERT INTO queue_daily_counter (queue_id, queue_date, last_seq) VALUES ($1, $2, 1)`,
      [queueId, TODAY],
    );
    await db.query(
      `INSERT INTO queue_entries
         (queue_id, queue_date, seq, display_number, customer_id, lane, status, joined_at)
       VALUES ($1, $2, 1, 'D001', $3, 'REGULAR', 'WAITING', $4)`,
      [queueId, TODAY, c1.id, DEFAULT_TEST_TIME],
    );

    const sid = await login();
    const res = await request(server()).post('/api/queues/D/entries').set('Cookie', `sid=${sid}`);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'DUPLICATE_ACTIVE_ENTRY', message: expect.any(String) },
    });

    const active = await db.query(
      `SELECT count(*)::int AS n FROM queue_entries
       WHERE queue_id = $1 AND queue_date = $2 AND customer_id = $3
         AND status IN ('WAITING','CALLED','SERVING')`,
      [queueId, TODAY, c1.id],
    );
    expect(active[0].n).toBe(1);

    const counter = await db.query(
      `SELECT last_seq FROM queue_daily_counter WHERE queue_id = $1 AND queue_date = $2`,
      [queueId, TODAY],
    );
    expect(counter[0].last_seq).toBe(1);
  });
});
