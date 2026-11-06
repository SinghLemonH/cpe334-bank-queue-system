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
});
