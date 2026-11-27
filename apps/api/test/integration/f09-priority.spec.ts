import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { Lane } from '../../src/domain/queue-entry';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';
import { clearDatabase, getTestDataSource } from '../helpers/test-db';

/**
 * F-09 Priority lane - API/integration tests TEST-55..TEST-59 (FX3).
 * Contract: docs/sprints/sprint-3/README.md (section 8.1), docs/sprints/sprint-3/sts.md.
 * TEST-57 is the TDD test (its red commit precedes the implementation).
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';

describe('F-09 Priority lane (integration)', () => {
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

    // FX3 customers: exact 60th birthday, one day under 60, 4 regular, 4 priority
    users.s60 = await insertUser('s60', 'CUSTOMER', '1966-11-06');
    users.s59 = await insertUser('s59', 'CUSTOMER', '1966-11-07');
    for (const name of ['r1', 'r2', 'r3', 'r4']) {
      users[name] = await insertUser(name, 'CUSTOMER', '1990-01-01');
    }
    for (const name of ['p1', 'p2', 'p3', 'p4']) {
      users[name] = await insertUser(name, 'CUSTOMER', '1950-01-01');
    }
    for (const name of ['teller1', 'teller2']) {
      users[name] = await insertUser(name, 'OPERATOR', null);
    }

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
      JOIN queues q ON u.username IN ('teller1', 'teller2') AND q.code = 'D'
      `,
    );
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  const server = () => app.getHttpServer();

  async function insertUser(
    username: string,
    role: 'CUSTOMER' | 'OPERATOR',
    dateOfBirth: string | null,
  ): Promise<string> {
    const rows = await db.query(
      `INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, passwordHash, username, role, dateOfBirth],
    );
    return rows[0].id as string;
  }

  async function login(username: string): Promise<string> {
    const res = await request(server()).post('/api/auth/login').send({ username, password: PASSWORD }).expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    expect(sid).toBeDefined();
    return sid as string;
  }

  async function insertEntry(code: string, seq: number, customer: string, lane: Lane): Promise<string> {
    const displayNumber = `${code}${String(seq).padStart(3, '0')}`;
    const rows = await db.query(
      `
      INSERT INTO queue_entries
        (queue_id, queue_date, seq, display_number, customer_id, lane, status, operator_id, joined_at)
      SELECT q.id, $2, $3, $4, $5, $6, 'WAITING', NULL, $7
      FROM queues q WHERE q.code = $1
      RETURNING id
      `,
      [code, TODAY, seq, displayNumber, users[customer], lane, DEFAULT_TEST_TIME],
    );
    return rows[0].id as string;
  }

  async function callAndComplete(operatorSid: string): Promise<{ id: string; displayNumber: string; lane: Lane }> {
    clock.setTime(new Date(clock.now().getTime() + 1000));
    const called = await request(server())
      .post('/api/queues/D/call-next')
      .set('Cookie', `sid=${operatorSid}`)
      .expect(200);
    const entry = called.body as { id: string; displayNumber: string; lane: Lane };
    await request(server())
      .post(`/api/entries/${entry.id}/start`)
      .set('Cookie', `sid=${operatorSid}`)
      .expect(200);
    await request(server())
      .post(`/api/entries/${entry.id}/complete`)
      .set('Cookie', `sid=${operatorSid}`)
      .expect(200);
    return entry;
  }

  it('TEST-55 (AC-55, BR-15): server assigns PRIORITY on 60th birthday and REGULAR one day under 60', async () => {
    const s59Sid = await login('s59');
    const s60Sid = await login('s60');

    const res59 = await request(server()).post('/api/queues/D/entries').set('Cookie', `sid=${s59Sid}`).expect(201);
    expect(res59.body.lane).toBe('REGULAR');
    expect(res59.body.peopleAhead).toBe(0);

    const res60 = await request(server()).post('/api/queues/D/entries').set('Cookie', `sid=${s60Sid}`).expect(201);
    expect(res60.body.lane).toBe('PRIORITY');
    // People ahead v2: PRIORITY ahead of REGULAR, so s60 has 0 people ahead while s59 now has 1.
    expect(res60.body.peopleAhead).toBe(0);

    const check59 = await request(server())
      .get(`/api/entries/${res59.body.id}`)
      .set('Cookie', `sid=${s59Sid}`)
      .expect(200);
    expect(check59.body.peopleAhead).toBe(1);
  });

  it('TEST-56 (AC-56, BR-15): rejects { lane: "PRIORITY" } with 400 and allows empty body with 201', async () => {
    const r1Sid = await login('r1');

    const rejected = await request(server())
      .post('/api/queues/D/entries')
      .set('Cookie', `sid=${r1Sid}`)
      .send({ lane: 'PRIORITY' })
      .expect(400);
    expect(rejected.body.code).toBe('VALIDATION_ERROR');

    const ok = await request(server()).post('/api/queues/D/entries').set('Cookie', `sid=${r1Sid}`).expect(201);
    expect(ok.body.lane).toBe('REGULAR');
  });

  it('TEST-57 (AC-57, BR-14) [TDD]: calls PRIORITY before REGULAR (R1, P1, R2, P2 -> P1, P2, R1, R2)', async () => {
    const r1Id = await insertEntry('D', 1, 'r1', 'REGULAR');
    const p1Id = await insertEntry('D', 2, 'p1', 'PRIORITY');
    const r2Id = await insertEntry('D', 3, 'r2', 'REGULAR');
    const p2Id = await insertEntry('D', 4, 'p2', 'PRIORITY');

    const tellerSid = await login('teller1');
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const entry = await callAndComplete(tellerSid);
      order.push(entry.id);
    }

    expect(order).toEqual([p1Id, p2Id, r1Id, r2Id]);
  });

  it('TEST-58 (AC-58, BR-14): anti-starvation calls REGULAR after 3 consecutive PRIORITY calls (P1..P4, R1, R2 -> P1, P2, P3, R1, P4, R2)', async () => {
    const p1Id = await insertEntry('D', 1, 'p1', 'PRIORITY');
    const p2Id = await insertEntry('D', 2, 'p2', 'PRIORITY');
    const p3Id = await insertEntry('D', 3, 'p3', 'PRIORITY');
    const p4Id = await insertEntry('D', 4, 'p4', 'PRIORITY');
    const r1Id = await insertEntry('D', 5, 'r1', 'REGULAR');
    const r2Id = await insertEntry('D', 6, 'r2', 'REGULAR');

    const tellerSid = await login('teller1');
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      const entry = await callAndComplete(tellerSid);
      order.push(entry.id);
    }

    expect(order).toEqual([p1Id, p2Id, p3Id, r1Id, p4Id, r2Id]);
  });

  it('TEST-59 (AC-59, BR-14): concurrent call-next returns distinct entries and enforces anti-starvation', async () => {
    const p1Id = await insertEntry('D', 1, 'p1', 'PRIORITY');
    const p2Id = await insertEntry('D', 2, 'p2', 'PRIORITY');
    const p3Id = await insertEntry('D', 3, 'p3', 'PRIORITY');
    const p4Id = await insertEntry('D', 4, 'p4', 'PRIORITY');
    const r1Id = await insertEntry('D', 5, 'r1', 'REGULAR');
    const r2Id = await insertEntry('D', 6, 'r2', 'REGULAR');

    const teller1Sid = await login('teller1');
    const teller2Sid = await login('teller2');

    async function concurrentRound(): Promise<string[]> {
      clock.setTime(new Date(clock.now().getTime() + 1000));
      const [res1, res2] = await Promise.all([
        request(server()).post('/api/queues/D/call-next').set('Cookie', `sid=${teller1Sid}`),
        request(server()).post('/api/queues/D/call-next').set('Cookie', `sid=${teller2Sid}`),
      ]);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.id).not.toBe(res2.body.id);

      await Promise.all([
        request(server())
          .post(`/api/entries/${res1.body.id}/start`)
          .set('Cookie', `sid=${teller1Sid}`)
          .expect(200)
          .then(() =>
            request(server())
              .post(`/api/entries/${res1.body.id}/complete`)
              .set('Cookie', `sid=${teller1Sid}`)
              .expect(200),
          ),
        request(server())
          .post(`/api/entries/${res2.body.id}/start`)
          .set('Cookie', `sid=${teller2Sid}`)
          .expect(200)
          .then(() =>
            request(server())
              .post(`/api/entries/${res2.body.id}/complete`)
              .set('Cookie', `sid=${teller2Sid}`)
              .expect(200),
          ),
      ]);
      return [res1.body.id as string, res2.body.id as string];
    }

    const round1 = await concurrentRound();
    const round2 = await concurrentRound();
    const round3 = await concurrentRound();

    expect(new Set(round1)).toEqual(new Set([p1Id, p2Id]));
    expect(new Set(round2)).toEqual(new Set([p3Id, r1Id]));
    expect(new Set(round3)).toEqual(new Set([p4Id, r2Id]));
  });
});
