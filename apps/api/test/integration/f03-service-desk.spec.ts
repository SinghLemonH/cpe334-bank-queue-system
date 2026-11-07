import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';

/**
 * F-03 Operator service desk - API/integration tests TEST-19..TEST-29.
 * Contract: docs/sprints/sprint-1/F-03-service-desk.md v1, STS section 2.3.
 * TEST-26 is the TDD test (its red commit precedes the implementation).
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';
const YESTERDAY = '2026-11-05';
const RANDOM_UUID = '00000000-0000-4000-8000-000000000000';

type Status = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED';

interface EntryOptions {
  status?: Status;
  operatorId?: string | null;
  queueDate?: string;
}

describe('F-03 Operator service desk (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let passwordHash: string;
  const users: Record<string, string> = {};

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

  /** Inserts an entry directly (fixture). Timestamps follow the status so the row is realistic. */
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
  const callNext = (sid: string, code: string) => post(sid, `/api/queues/${code}/call-next`);

  function get(sid: string, path: string) {
    return request(server()).get(path).set('Cookie', `sid=${sid}`);
  }

  function expectError(res: request.Response, status: number, code: string) {
    expect(res.status).toBe(status);
    expect(Object.keys(res.body)).toEqual(['error']);
    expect(res.body.error.code).toBe(code);
  }

  // ---------------------------------------------------------------------------
  // TEST-26 / AC-26 (TDD): invalid transitions are rejected and change nothing
  // ---------------------------------------------------------------------------

  it('TEST-26 / AC-26: completing a CALLED entry returns 409 INVALID_TRANSITION and leaves the row unchanged', async () => {
    const id = await insertEntry('D', 1, 'c1', { status: 'CALLED', operatorId: users.teller1 });
    const before = await row(id);
    const sid = await login('teller1');

    expectError(await complete(sid, id), 409, 'INVALID_TRANSITION');
    expect(await row(id)).toEqual(before);
  });

  it('TEST-26 / AC-26: starting a SERVING entry (start twice) returns 409 INVALID_TRANSITION', async () => {
    const id = await insertEntry('D', 1, 'c1', { status: 'SERVING', operatorId: users.teller1 });
    const before = await row(id);
    const sid = await login('teller1');

    expectError(await start(sid, id), 409, 'INVALID_TRANSITION');
    expect(await row(id)).toEqual(before);
  });

  it('TEST-26 / AC-26: starting or completing a COMPLETED entry returns 409 INVALID_TRANSITION', async () => {
    const id = await insertEntry('D', 1, 'c1', { status: 'COMPLETED', operatorId: users.teller1 });
    const before = await row(id);
    const sid = await login('teller1');

    expectError(await start(sid, id), 409, 'INVALID_TRANSITION');
    expectError(await complete(sid, id), 409, 'INVALID_TRANSITION');
    expect(await row(id)).toEqual(before);
  });

  it('TEST-26 / AC-26: starting or completing a WAITING entry returns 409 INVALID_TRANSITION (C-2)', async () => {
    const id = await insertEntry('D', 1, 'c1');
    const before = await row(id);
    const sid = await login('teller1');

    expectError(await start(sid, id), 409, 'INVALID_TRANSITION');
    expectError(await complete(sid, id), 409, 'INVALID_TRANSITION');
    expect(await row(id)).toEqual(before);
  });

  it('TEST-26 / AC-26: start or complete with a malformed or unknown id returns 404 NOT_FOUND', async () => {
    const sid = await login('teller1');
    for (const id of ['not-a-uuid', RANDOM_UUID]) {
      expectError(await start(sid, id), 404, 'NOT_FOUND');
      expectError(await complete(sid, id), 404, 'NOT_FOUND');
    }
  });

  // ---------------------------------------------------------------------------
  // TEST-19..TEST-25, TEST-27..TEST-29
  // ---------------------------------------------------------------------------

  it('TEST-19 / AC-19: operator sees only assigned queues with waiting counts and the held entry', async () => {
    await insertEntry('D', 1, 'c1');
    await insertEntry('D', 2, 'c2');
    await insertEntry('L', 1, 'c3');
    const sid = await login('teller1');

    const queues = await get(sid, '/api/operator/queues').expect(200);
    expect(queues.body).toEqual([{ code: 'D', name: 'Deposit & Withdrawal', isOpen: true, waitingCount: 2 }]);

    const before = await get(sid, '/api/operator/current-entry').expect(200);
    expect(before.body).toEqual({ entry: null });

    const called = await callNext(sid, 'D').expect(200);
    const after = await get(sid, '/api/operator/current-entry').expect(200);
    expect(after.body.entry).toMatchObject({ id: called.body.id, displayNumber: 'D001', status: 'CALLED' });

    const counts = await get(sid, '/api/operator/queues').expect(200);
    expect(counts.body[0].waitingCount).toBe(1);
  });

  it('TEST-20 / AC-20: call-next takes the lowest-seq WAITING entry and records the operator', async () => {
    const first = await insertEntry('D', 1, 'c1');
    const second = await insertEntry('D', 2, 'c2');
    const sid = await login('teller1');
    clock.advanceMinutes(5);

    const res = await callNext(sid, 'D').expect(200);
    expect(res.body).toMatchObject({
      id: first,
      queueCode: 'D',
      displayNumber: 'D001',
      status: 'CALLED',
      peopleAhead: null,
      calledAt: clock.now().toISOString(),
    });
    expect(res.body).not.toHaveProperty('operatorId');
    expect(res.body).not.toHaveProperty('customerId');
    expect((await row(first)).operator_id).toBe(users.teller1);
    expect((await row(second)).status).toBe('WAITING');
  });

  it('TEST-21 / AC-21: call-next with nothing WAITING today returns 409 NO_WAITING_ENTRY', async () => {
    const yesterday = await insertEntry('D', 1, 'c1', { queueDate: YESTERDAY });
    const before = await row(yesterday);
    const sid = await login('teller1');

    expectError(await callNext(sid, 'D'), 409, 'NO_WAITING_ENTRY');
    expect(await row(yesterday)).toEqual(before);
  });

  it('TEST-22 / AC-22: call-next while holding a CALLED or SERVING entry returns 409 OPERATOR_BUSY', async () => {
    await insertEntry('D', 1, 'c1');
    const waiting = await insertEntry('D', 2, 'c2');
    const sid = await login('teller1');

    const held = await callNext(sid, 'D').expect(200);
    expectError(await callNext(sid, 'D'), 409, 'OPERATOR_BUSY');

    await start(sid, held.body.id).expect(200);
    expectError(await callNext(sid, 'D'), 409, 'OPERATOR_BUSY');

    expect(await row(waiting)).toMatchObject({ status: 'WAITING', operator_id: null, called_at: null });
  });

  it('TEST-23 / AC-23: call-next on a queue that is not assigned returns 403 FORBIDDEN', async () => {
    const loan = await insertEntry('L', 1, 'c1');
    const sid = await login('teller1');

    expectError(await callNext(sid, 'L'), 403, 'FORBIDDEN');
    expect(await row(loan)).toMatchObject({ status: 'WAITING', operator_id: null });
  });

  it('TEST-23 / AC-23: unknown queue code is 404; start on an unassigned queue is 403 FORBIDDEN', async () => {
    await insertEntry('D', 1, 'c1');
    const teller = await login('teller1');
    const loanOfficer = await login('loanofficer1');

    expectError(await callNext(teller, 'Z'), 404, 'NOT_FOUND');

    const called = await callNext(teller, 'D').expect(200);
    expectError(await start(loanOfficer, called.body.id), 403, 'FORBIDDEN');
    expect((await row(called.body.id)).status).toBe('CALLED');
  });

  it('TEST-24 / AC-24: concurrent call-next never hands the same entry to two operators (5 rounds)', async () => {
    const t1 = await login('teller1');
    const t2 = await login('teller2');

    for (let round = 0; round < 5; round += 1) {
      // (a) two waiting -> two different entries
      await db.query(`DELETE FROM queue_entries`);
      await insertEntry('D', 1, 'c1');
      await insertEntry('D', 2, 'c2');
      const [a1, a2] = await Promise.all([callNext(t1, 'D'), callNext(t2, 'D')]);
      expect([a1.status, a2.status]).toEqual([200, 200]);
      expect(a1.body.id).not.toBe(a2.body.id);

      // (b) one waiting -> one 200, one 409 NO_WAITING_ENTRY
      await db.query(`DELETE FROM queue_entries`);
      const only = await insertEntry('D', 1, 'c1');
      const results = await Promise.all([callNext(t1, 'D'), callNext(t2, 'D')]);
      const ok = results.filter((r) => r.status === 200);
      const rejected = results.filter((r) => r.status === 409);
      expect(ok).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(ok[0].body.id).toBe(only);
      expect(rejected[0].body.error.code).toBe('NO_WAITING_ENTRY');
    }
  });

  it('TEST-25 / AC-25: start and complete record timestamps and the customer sees each status', async () => {
    const id = await insertEntry('D', 1, 'c1');
    const teller = await login('teller1');
    const customer = await login('c1');
    await callNext(teller, 'D').expect(200);

    clock.advanceMinutes(3);
    const t1 = clock.now().toISOString();
    const started = await start(teller, id).expect(200);
    expect(started.body).toMatchObject({ id, status: 'SERVING', startedAt: t1, endedAt: null });
    expect((await get(customer, `/api/entries/${id}`).expect(200)).body.status).toBe('SERVING');

    clock.advanceMinutes(7);
    const t2 = clock.now().toISOString();
    const completed = await complete(teller, id).expect(200);
    expect(completed.body).toMatchObject({ id, status: 'COMPLETED', startedAt: t1, endedAt: t2 });
    expect((await get(customer, `/api/entries/${id}`).expect(200)).body).toMatchObject({
      status: 'COMPLETED',
      endedAt: t2,
    });
    expect((await get(teller, '/api/operator/current-entry').expect(200)).body).toEqual({ entry: null });
  });

  it('TEST-25 / AC-25: after completing, the operator is free to call the next entry', async () => {
    const first = await insertEntry('D', 1, 'c1');
    await insertEntry('D', 2, 'c2');
    const sid = await login('teller1');

    await callNext(sid, 'D').expect(200);
    await start(sid, first).expect(200);
    await complete(sid, first).expect(200);

    const next = await callNext(sid, 'D').expect(200);
    expect(next.body).toMatchObject({ displayNumber: 'D002', status: 'CALLED' });
  });

  it('TEST-27 / AC-27: another operator cannot start or complete an entry they did not call', async () => {
    const id = await insertEntry('D', 1, 'c1');
    const t1 = await login('teller1');
    const t2 = await login('teller2');
    await callNext(t1, 'D').expect(200);
    const called = await row(id);

    expectError(await start(t2, id), 403, 'NOT_ENTRY_OWNER');
    expect(await row(id)).toEqual(called);

    await start(t1, id).expect(200);
    expectError(await complete(t2, id), 403, 'NOT_ENTRY_OWNER');
    expect((await row(id)).status).toBe('SERVING');
  });

  it('TEST-28 / AC-28: a customer gets 403 FORBIDDEN on every operator endpoint', async () => {
    const id = await insertEntry('D', 1, 'c1');
    const before = await row(id);
    const sid = await login('c1');

    expectError(await callNext(sid, 'D'), 403, 'FORBIDDEN');
    expectError(await start(sid, id), 403, 'FORBIDDEN');
    expectError(await complete(sid, id), 403, 'FORBIDDEN');
    expectError(await get(sid, '/api/operator/queues'), 403, 'FORBIDDEN');
    expectError(await get(sid, '/api/operator/current-entry'), 403, 'FORBIDDEN');
    expect(await row(id)).toEqual(before);
  });

  it('TEST-29 / AC-29: a COMPLETED entry survives an API restart (NFR-04)', async () => {
    const id = await insertEntry('D', 1, 'c1');
    const teller = await login('teller1');
    await callNext(teller, 'D').expect(200);
    clock.advanceMinutes(2);
    await start(teller, id).expect(200);
    clock.advanceMinutes(4);
    const done = await complete(teller, id).expect(200);

    // Close the Nest app and build a new one against the same test database.
    await app.close();
    ({ app } = await createTestApp(clock));

    const customer = await login('c1');
    const res = await get(customer, `/api/entries/${id}`).expect(200);
    expect(res.body).toEqual(done.body);
    expect(res.body.status).toBe('COMPLETED');
  });
});
