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

  function get(sid: string, path: string) {
    return request(server()).get(path).set('Cookie', `sid=${sid}`);
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
  // TEST-42 / AC-42: call-next with counterId sets counter and returns counterLabel
  // ---------------------------------------------------------------------------

  it('TEST-42 / AC-42: call-next with counterId sets counter and returns counterLabel, persisted in DB and GET', async () => {
    const e1 = await insertEntry('D', 1, 'c1');
    const sidTeller = await login('teller1');
    const sidCustomer = await login('c1');

    const res = await callNext(sidTeller, 'D', { counterId: counters.K1 });
    expect(res.status).toBe(200);
    expect(res.body.counterLabel).toBe('Counter 1');
    expect(res.body.status).toBe('CALLED');

    // Customer GET /api/entries/:id shows same counterLabel
    const getRes = await get(sidCustomer, `/api/entries/${e1}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.counterLabel).toBe('Counter 1');

    // DB has counter_id
    const dbRow = await db.query(`SELECT counter_id FROM queue_entries WHERE id = $1`, [e1]);
    expect(dbRow[0].counter_id).toBe(counters.K1);
  });

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

  // ---------------------------------------------------------------------------
  // TEST-44 / AC-44: counter validation
  // ---------------------------------------------------------------------------

  it('TEST-44 / AC-44: counter of another queue or unknown is 404; invalid body is 400', async () => {
    const e1 = await insertEntry('D', 1, 'c1');
    const before = await row(e1);
    const sid = await login('teller1');

    // Counter KL belongs to queue L, not D -> 404 NOT_FOUND
    expectError(await callNext(sid, 'D', { counterId: counters.KL }), 404, 'NOT_FOUND');
    // Random UUID -> 404 NOT_FOUND
    expectError(await callNext(sid, 'D', { counterId: '00000000-0000-4000-8000-000000000000' }), 404, 'NOT_FOUND');
    // Non-UUID -> 400 VALIDATION_FAILED
    expectError(await callNext(sid, 'D', { counterId: 'abc' }), 400, 'VALIDATION_FAILED');
    // Extra field -> 400 VALIDATION_FAILED
    expectError(await callNext(sid, 'D', { counterId: counters.K1, extra: 1 }), 400, 'VALIDATION_FAILED');

    // Nothing called
    expect(await row(e1)).toEqual(before);
  });

  // ---------------------------------------------------------------------------
  // TEST-45 / AC-45: call-next without body works (Sprint 1 regression)
  // ---------------------------------------------------------------------------

  it('TEST-45 / AC-45: call-next without body still returns CALLED with counterLabel: null', async () => {
    await insertEntry('D', 1, 'c1');
    const sid = await login('teller1');

    const res = await callNext(sid, 'D');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CALLED');
    expect(res.body.counterLabel).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // TEST-46 / AC-46: GET /api/queues/:code/counters list
  // ---------------------------------------------------------------------------

  it('TEST-46 / AC-46: counter list permissions and ordering', async () => {
    const sidTeller = await login('teller1');
    const sidLoan = await login('loanofficer1');
    const sidCustomer = await login('c1');

    // Assigned operator on D -> 200 with K1 and K2 only, ordered by label
    const res = await get(sidTeller, '/api/queues/D/counters');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: counters.K1, label: 'Counter 1' },
      { id: counters.K2, label: 'Counter 2' },
    ]);

    // Unassigned operator on D -> 403 FORBIDDEN
    expectError(await get(sidLoan, '/api/queues/D/counters'), 403, 'FORBIDDEN');

    // Customer on D -> 403 FORBIDDEN
    expectError(await get(sidCustomer, '/api/queues/D/counters'), 403, 'FORBIDDEN');
  });
});
