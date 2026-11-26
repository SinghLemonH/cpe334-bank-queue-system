import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';

/**
 * F-07 Counters (+ F-03 contract v2) - API/integration tests TEST-42..TEST-46.
 * Contract: docs/sprints/sprint-2/README.md section 4.4, STS section 2.4.
 * TEST-43 is the TDD test (its red commit precedes the implementation).
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';

type Status = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED';

interface EntryOptions {
  status?: Status;
  operatorId?: string | null;
  counterId?: string | null;
  queueDate?: string;
}

describe('F-07 Counters (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let passwordHash: string;
  const users: Record<string, string> = {};
  const counters: Record<string, string> = {};

  beforeAll(async () => {
    db = await getTestDataSource();
    passwordHash = await PasswordHasher.hash(PASSWORD);
    ({ app, clock } = await createTestApp());
  });

  beforeEach(async () => {
    clock.setTime(DEFAULT_TEST_TIME);
    await clearDatabase(db);
    for (const name of ['c1', 'c2', 'c3']) users[name] = await insertUser(name, 'CUSTOMER');
    for (const name of ['teller1', 'teller2', 'loanofficer1']) users[name] = await insertUser(name, 'OPERATOR');
    await db.query(
      `INSERT INTO queues (code, name, is_open) VALUES
         ('D', 'Deposit & Withdrawal', true),
         ('L', 'Loans', true),
         ('O', 'Account Opening', true)`,
    );
    await db.query(
      `
      INSERT INTO operator_queue_assignment (operator_id, queue_id)
      SELECT u.id, q.id
      FROM users u
      JOIN queues q ON
        (u.username IN ('teller1', 'teller2') AND q.code = 'D')
        OR (u.username = 'loanofficer1' AND q.code = 'L')
      `,
    );

    // FX2: counters K1 "Counter 1", K2 "Counter 2" on D, KL "Counter 3" on L
    try {
      const dQueue = await db.query(`SELECT id FROM queues WHERE code = 'D'`);
      const lQueue = await db.query(`SELECT id FROM queues WHERE code = 'L'`);
      const k1Rows = await db.query(
        `INSERT INTO counters (queue_id, label) VALUES ($1, 'Counter 1') RETURNING id`,
        [dQueue[0].id],
      );
      counters['K1'] = k1Rows[0].id;
      const k2Rows = await db.query(
        `INSERT INTO counters (queue_id, label) VALUES ($1, 'Counter 2') RETURNING id`,
        [dQueue[0].id],
      );
      counters['K2'] = k2Rows[0].id;
      const klRows = await db.query(
        `INSERT INTO counters (queue_id, label) VALUES ($1, 'Counter 3') RETURNING id`,
        [lQueue[0].id],
      );
      counters['KL'] = klRows[0].id;
    } catch {
      // Table counters does not exist yet (pre-implementation / red phase)
      counters['K1'] = '11111111-1111-4111-8111-111111111111';
      counters['K2'] = '22222222-2222-4222-8222-222222222222';
      counters['KL'] = '33333333-3333-4333-8333-333333333333';
    }
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  const server = () => app.getHttpServer();

  async function insertUser(username: string, role: 'CUSTOMER' | 'OPERATOR'): Promise<string> {
    const rows = await db.query(
      `INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, passwordHash, username, role, role === 'CUSTOMER' ? '1990-01-01' : null],
    );
    return rows[0].id as string;
  }

  async function login(username: string): Promise<string> {
    const res = await request(server()).post('/api/auth/login').send({ username, password: PASSWORD }).expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    expect(sid).toBeDefined();
    return sid as string;
  }

  async function insertEntry(code: string, seq: number, customer: string, opts: EntryOptions = {}): Promise<string> {
    const status = opts.status ?? 'WAITING';
    const operatorId = opts.operatorId === undefined ? null : opts.operatorId;
    const at = DEFAULT_TEST_TIME;
    const rows = await db.query(
      `
      INSERT INTO queue_entries
        (queue_id, queue_date, seq, display_number, customer_id, lane, status, operator_id,
         joined_at, called_at, started_at, ended_at)
      SELECT q.id, $2, $3, $4, $5, 'REGULAR', $6, $7, $8, $9, $10, $11
      FROM queues q WHERE q.code = $1
      RETURNING id
      `,
      [
        code,
        opts.queueDate ?? TODAY,
        seq,
        `${code}${String(seq).padStart(3, '0')}`,
        users[customer],
        status,
        operatorId,
        at,
        status === 'WAITING' ? null : at,
        status === 'SERVING' || status === 'COMPLETED' ? at : null,
        status === 'COMPLETED' ? at : null,
      ],
    );
    return rows[0].id as string;
  }

  async function row(id: string): Promise<Record<string, unknown>> {
    const rows = await db.query(
      `SELECT status, operator_id, called_at, started_at, ended_at FROM queue_entries WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  function post(sid: string, path: string) {
    return request(server()).post(path).set('Cookie', `sid=${sid}`);
  }

  const start = (sid: string, id: string) => post(sid, `/api/entries/${id}/start`);
  const complete = (sid: string, id: string) => post(sid, `/api/entries/${id}/complete`);
  const callNext = (sid: string, code: string, body?: Record<string, unknown>) => {
    const req = post(sid, `/api/queues/${code}/call-next`);
    return body ? req.send(body) : req;
  };

  function expectError(res: request.Response, status: number, code: string) {
    expect(res.status).toBe(status);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe(code);
  }

  // ---------------------------------------------------------------------------
  // TEST-43 / AC-43 (TDD): busy counter returns 409 COUNTER_BUSY
  // ---------------------------------------------------------------------------

  it('TEST-43 / AC-43: while teller1 holds a counter (CALLED or SERVING), teller2 calling with the same counter gets 409 COUNTER_BUSY', async () => {
    const e1 = await insertEntry('D', 1, 'c1');
    const e2 = await insertEntry('D', 2, 'c2');
    await insertEntry('D', 3, 'c3');
    const sid1 = await login('teller1');
    const sid2 = await login('teller2');

    // 1. teller1 calls with K1 -> 200 CALLED
    const res1 = await callNext(sid1, 'D', { counterId: counters.K1 });
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('CALLED');

    // 2. teller2 calls with K1 while teller1 is CALLED -> 409 COUNTER_BUSY, no entry changed
    const before2 = await row(e2);
    const res2 = await callNext(sid2, 'D', { counterId: counters.K1 });
    expectError(res2, 409, 'COUNTER_BUSY');
    expect(await row(e2)).toEqual(before2);

    // 3. teller1 starts -> SERVING
    const startRes = await start(sid1, e1);
    expect(startRes.status).toBe(200);

    // 4. teller2 calls with K1 while teller1 is SERVING -> 409 COUNTER_BUSY, no entry changed
    const res3 = await callNext(sid2, 'D', { counterId: counters.K1 });
    expectError(res3, 409, 'COUNTER_BUSY');
    expect(await row(e2)).toEqual(before2);

    // 5. teller1 completes -> COMPLETED
    const compRes = await complete(sid1, e1);
    expect(compRes.status).toBe(200);

    // 6. teller2 calls with K1 after complete -> succeeds (200 CALLED) with "Counter 1"
    const res4 = await callNext(sid2, 'D', { counterId: counters.K1 });
    expect(res4.status).toBe(200);
    expect(res4.body.counterLabel).toBe('Counter 1');
  });
});
