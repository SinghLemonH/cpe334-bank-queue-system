import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';

/**
 * F-02 Join queue & my ticket - API/integration tests TEST-09..TEST-17.
 * Contract: docs/sprints/sprint-1/F-02-join-queue.md v1, STS section 2.2.
 * TEST-11 is the TDD test (red commit precedes this implementation).
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';

const ENTRY_KEYS = [
  'id',
  'queueCode',
  'displayNumber',
  'status',
  'lane',
  'counterLabel',
  'peopleAhead',
  'joinedAt',
  'calledAt',
  'startedAt',
  'endedAt',
];

describe('F-02 Join queue (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let passwordHash: string;
  let c1: { id: string };
  let c2: { id: string };
  let teller1: { id: string };

  beforeAll(async () => {
    db = await getTestDataSource();
    passwordHash = await PasswordHasher.hash(PASSWORD);
    ({ app, clock } = await createTestApp());
  });

  beforeEach(async () => {
    clock.setTime(DEFAULT_TEST_TIME);
    await clearDatabase(db);
    c1 = await insertUser('c1', 'CUSTOMER', 'Customer One');
    c2 = await insertUser('c2', 'CUSTOMER', 'Customer Two');
    teller1 = await insertUser('teller1', 'OPERATOR', 'Teller 1');
    await insertUser('teller2', 'OPERATOR', 'Teller 2');
    await insertUser('loanofficer1', 'OPERATOR', 'Loan Officer 1');
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

  async function insertUser(
    username: string,
    role: 'CUSTOMER' | 'OPERATOR',
    displayName: string,
  ): Promise<{ id: string }> {
    const dob = role === 'CUSTOMER' ? '1990-01-01' : null;
    const rows = await db.query(
      `
      INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [username, passwordHash, displayName, role, dob],
    );
    return rows[0];
  }

  async function login(username: string): Promise<string> {
    const res = await request(server()).post('/api/auth/login').send({ username, password: PASSWORD }).expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    expect(sid).toBeDefined();
    return sid as string;
  }

  function join(sid: string, code: string) {
    return request(server()).post(`/api/queues/${code}/entries`).set('Cookie', `sid=${sid}`);
  }

  async function queueId(code: string): Promise<string> {
    const rows = await db.query(`SELECT id FROM queues WHERE code = $1`, [code]);
    return rows[0].id as string;
  }

  it('TEST-09 / AC-09: lists queues with today waiting counts for any signed-in user', async () => {
    const dId = await queueId('D');
    await db.query(`UPDATE queues SET is_open = false WHERE code = 'O'`);
    await insertEntry(dId, TODAY, 1, 'D001', c1.id);
    await insertEntry(dId, TODAY, 2, 'D002', c2.id);
    await insertEntry(dId, '2026-11-05', 1, 'D001', c1.id);

    const expected = [
      { code: 'D', name: 'Deposit & Withdrawal', isOpen: true, waitingCount: 2 },
      { code: 'L', name: 'Loans', isOpen: true, waitingCount: 0 },
      { code: 'O', name: 'Account Opening', isOpen: false, waitingCount: 0 },
    ];

    const customerSid = await login('c1');
    const tellerSid = await login('teller1');
    const asCustomer = await request(server()).get('/api/queues').set('Cookie', `sid=${customerSid}`).expect(200);
    const asTeller = await request(server()).get('/api/queues').set('Cookie', `sid=${tellerSid}`).expect(200);
    expect(asCustomer.body).toEqual(expected);
    expect(asTeller.body).toEqual(expected);
  });

  it('TEST-10 / AC-10: customer joins an open queue and the row is stored', async () => {
    const sid = await login('c1');
    const res = await join(sid, 'D').expect(201);

    expect(Object.keys(res.body).sort()).toEqual([...ENTRY_KEYS].sort());
    expect(res.body).toMatchObject({
      queueCode: 'D',
      displayNumber: 'D001',
      status: 'WAITING',
      lane: 'REGULAR',
      counterLabel: null,
      peopleAhead: 0,
      joinedAt: DEFAULT_TEST_TIME.toISOString(),
      calledAt: null,
      startedAt: null,
      endedAt: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/customer|operator|displayName|argon/i);

    const rows = await db.query(
      `SELECT customer_id, seq, queue_date::text AS queue_date, joined_at
       FROM queue_entries WHERE id = $1`,
      [res.body.id],
    );
    expect(rows[0].customer_id).toBe(c1.id);
    expect(rows[0].seq).toBe(1);
    expect(rows[0].queue_date).toBe(TODAY);
    expect(new Date(rows[0].joined_at).toISOString()).toBe(DEFAULT_TEST_TIME.toISOString());
  });

  it('TEST-10 / AC-10: a request body cannot choose the lane or the customer', async () => {
    const sid = await login('c1');
    // F-09 (AC-56, BR-15): JoinQueueDto rejects any client-supplied fields with 400 VALIDATION_FAILED.
    const rejected = await request(server())
      .post('/api/queues/D/entries')
      .set('Cookie', `sid=${sid}`)
      .send({ lane: 'PRIORITY', customerId: c2.id })
      .expect(400);
    expect(rejected.body.error.code).toBe('VALIDATION_FAILED');

    const before = await db.query(`SELECT id FROM queue_entries`);
    expect(before).toHaveLength(0);

    const res = await request(server()).post('/api/queues/D/entries').set('Cookie', `sid=${sid}`).expect(201);
    expect(res.body.lane).toBe('REGULAR');
    const rows = await db.query(`SELECT customer_id, lane FROM queue_entries WHERE id = $1`, [res.body.id]);
    expect(rows[0].customer_id).toBe(c1.id);
    expect(rows[0].lane).toBe('REGULAR');
  });

  it('TEST-11 / AC-11: rejects second active entry for same customer and queue', async () => {
    const dId = await queueId('D');
    await db.query(`INSERT INTO queue_daily_counter (queue_id, queue_date, last_seq) VALUES ($1, $2, 1)`, [
      dId,
      TODAY,
    ]);
    await insertEntry(dId, TODAY, 1, 'D001', c1.id);

    const res = await join(await login('c1'), 'D');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'DUPLICATE_ACTIVE_ENTRY', message: expect.any(String) },
    });

    const active = await db.query(
      `SELECT count(*)::int AS n FROM queue_entries
       WHERE queue_id = $1 AND queue_date = $2 AND customer_id = $3
         AND status IN ('WAITING','CALLED','SERVING')`,
      [dId, TODAY, c1.id],
    );
    expect(active[0].n).toBe(1);

    const counter = await db.query(
      `SELECT last_seq FROM queue_daily_counter WHERE queue_id = $1 AND queue_date = $2`,
      [dId, TODAY],
    );
    expect(counter[0].last_seq).toBe(1);
  });

  /*
   * TEST-12 v2 / AC-12 v2 (Lab 7 CR-01, STS v2). BR-02 v2: one active entry per customer per day
   * across ALL queues. Replaces TEST-12 v1 "the same customer can be active in two queues" (D and L both 201).
   */
  async function activeCount(customerId: string): Promise<number> {
    const rows = await db.query(
      `SELECT count(*)::int AS n FROM queue_entries
       WHERE customer_id = $1 AND queue_date = $2 AND status IN ('WAITING','CALLED','SERVING')`,
      [customerId, TODAY],
    );
    return rows[0].n as number;
  }

  async function lRowsToday(): Promise<{ entries: number; counters: number }> {
    const lId = await queueId('L');
    const e = await db.query(`SELECT count(*)::int AS n FROM queue_entries WHERE queue_id = $1 AND queue_date = $2`, [
      lId,
      TODAY,
    ]);
    const c = await db.query(
      `SELECT count(*)::int AS n FROM queue_daily_counter WHERE queue_id = $1 AND queue_date = $2`,
      [lId, TODAY],
    );
    return { entries: e[0].n, counters: c[0].n };
  }

  it('TEST-12 v2 / AC-12: a customer active in D today cannot join L (one active ticket across queues)', async () => {
    const sid = await login('c1');
    const d = await join(sid, 'D').expect(201);
    expect(d.body.displayNumber).toBe('D001');

    const l = await join(sid, 'L');
    expect(l.status).toBe(409);
    expect(l.body).toEqual({ error: { code: 'DUPLICATE_ACTIVE_ENTRY', message: expect.any(String) } });

    expect(await activeCount(c1.id)).toBe(1);
    expect(await lRowsToday()).toEqual({ entries: 0, counters: 0 });
  });

  it('TEST-12 v2 / AC-12: boundary - a CALLED or SERVING entry in D also blocks joining L', async () => {
    const sid = await login('c1');
    const d = await join(sid, 'D').expect(201);

    await db.query(`UPDATE queue_entries SET status = 'CALLED', operator_id = $2, called_at = $3 WHERE id = $1`, [
      d.body.id,
      teller1.id,
      DEFAULT_TEST_TIME,
    ]);
    const whileCalled = await join(sid, 'L');
    expect(whileCalled.status).toBe(409);
    expect(whileCalled.body.error.code).toBe('DUPLICATE_ACTIVE_ENTRY');

    await db.query(`UPDATE queue_entries SET status = 'SERVING', started_at = $2 WHERE id = $1`, [
      d.body.id,
      DEFAULT_TEST_TIME,
    ]);
    const whileServing = await join(sid, 'L');
    expect(whileServing.status).toBe(409);
    expect(whileServing.body.error.code).toBe('DUPLICATE_ACTIVE_ENTRY');

    expect(await lRowsToday()).toEqual({ entries: 0, counters: 0 });
  });

  it('TEST-12 v2 / AC-12: boundary - a COMPLETED entry in D frees the customer to join L', async () => {
    const sid = await login('c1');
    const d = await join(sid, 'D').expect(201);
    await db.query(`UPDATE queue_entries SET status = 'COMPLETED', operator_id = $2, ended_at = $3 WHERE id = $1`, [
      d.body.id,
      teller1.id,
      DEFAULT_TEST_TIME,
    ]);

    const l = await join(sid, 'L').expect(201);
    expect(l.body.displayNumber).toBe('L001');
  });

  it("TEST-12 v2 / AC-12: boundary - yesterday's active entry in D does not block L today", async () => {
    await insertEntry(await queueId('D'), '2026-11-05', 1, 'D001', c1.id);
    const l = await join(await login('c1'), 'L').expect(201);
    expect(l.body.displayNumber).toBe('L001');
  });

  it('TEST-12 v2 / AC-12: race - concurrent joins to D and L by one customer give exactly one ticket', async () => {
    const sid = await login('c1');
    const results = await Promise.all([join(sid, 'D'), join(sid, 'L')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)?.body.error.code).toBe('DUPLICATE_ACTIVE_ENTRY');
    expect(await activeCount(c1.id)).toBe(1);
  });

  it('TEST-12 / AC-12: a completed entry frees the queue for another ticket the same day', async () => {
    const sid = await login('c1');
    const first = await join(sid, 'D').expect(201);
    await db.query(`UPDATE queue_entries SET status = 'COMPLETED', operator_id = $2, ended_at = $3 WHERE id = $1`, [
      first.body.id,
      teller1.id,
      DEFAULT_TEST_TIME,
    ]);

    const second = await join(sid, 'D').expect(201);
    expect(second.body.displayNumber).toBe('D002');
  });

  it('TEST-13 / AC-13: a closed queue rejects the join and does not take a number', async () => {
    await db.query(`UPDATE queues SET is_open = false WHERE code = 'D'`);
    const res = await join(await login('c1'), 'D').expect(409);
    expect(res.body.error.code).toBe('QUEUE_CLOSED');

    const entries = await db.query(`SELECT count(*)::int AS n FROM queue_entries`);
    expect(entries[0].n).toBe(0);
    const counters = await db.query(
      `SELECT count(*)::int AS n FROM queue_daily_counter c
       JOIN queues q ON q.id = c.queue_id
       WHERE q.code = 'D' AND c.queue_date = $1`,
      [TODAY],
    );
    expect(counters[0].n).toBe(0);
  });

  it('TEST-13 / AC-13: an unknown or lower-case queue code is not found', async () => {
    const sid = await login('c1');
    const unknown = await join(sid, 'Z').expect(404);
    const lower = await join(sid, 'd').expect(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');
    expect(lower.body.error.code).toBe('NOT_FOUND');
  });

  it('TEST-14 / AC-14: twenty concurrent joins receive seq 1 through 20', async () => {
    const sids: string[] = [];
    for (let i = 1; i <= 20; i++) {
      await insertUser(`u${i}`, 'CUSTOMER', `User ${i}`);
      sids.push(await login(`u${i}`));
    }

    const results = await Promise.all(sids.map((sid) => join(sid, 'D')));
    expect(results.map((r) => r.status)).toEqual(Array(20).fill(201));

    const rows = await db.query(
      `SELECT seq, display_number FROM queue_entries e
       JOIN queues q ON q.id = e.queue_id
       WHERE q.code = 'D' AND e.queue_date = $1
       ORDER BY seq`,
      [TODAY],
    );
    expect(rows.map((r: { seq: number }) => r.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(new Set(rows.map((r: { display_number: string }) => r.display_number)).size).toBe(20);

    const counter = await db.query(
      `SELECT last_seq FROM queue_daily_counter c
       JOIN queues q ON q.id = c.queue_id
       WHERE q.code = 'D' AND c.queue_date = $1`,
      [TODAY],
    );
    expect(Number(counter[0].last_seq)).toBe(20);
  });

  it('TEST-15 / AC-15: numbering restarts at Bangkok midnight and an older active entry does not block', async () => {
    clock.setTime(new Date('2026-11-06T16:59:00.000Z'));
    const c1Sid = await login('c1');
    const c2Sid = await login('c2');

    const d1 = await join(c1Sid, 'D').expect(201);
    const d2 = await join(c2Sid, 'D').expect(201);
    // STS v2 (Lab 7 CR-01): a third customer joins L, because under BR-02 v2 c1 and c2 already hold D.
    // The numbering and midnight assertions are unchanged.
    await insertUser('c3', 'CUSTOMER', 'Customer Three');
    const l1 = await join(await login('c3'), 'L').expect(201);
    expect([d1.body.displayNumber, d2.body.displayNumber, l1.body.displayNumber]).toEqual(['D001', 'D002', 'L001']);

    const before = await db.query(
      `SELECT q.code, e.display_number, e.queue_date::text AS queue_date
       FROM queue_entries e JOIN queues q ON q.id = e.queue_id
       ORDER BY q.code, e.seq`,
    );
    expect(before.map((r: { queue_date: string }) => r.queue_date)).toEqual(['2026-11-06', '2026-11-06', '2026-11-06']);

    clock.setTime(new Date('2026-11-06T17:00:00.000Z'));
    const nextDay = await join(c2Sid, 'D').expect(201);
    expect(nextDay.body.displayNumber).toBe('D001');

    const stored = await db.query(`SELECT queue_date::text AS queue_date FROM queue_entries WHERE id = $1`, [
      nextDay.body.id,
    ]);
    expect(stored[0].queue_date).toBe('2026-11-07');
  });

  it("TEST-16 / AC-16: a customer reads their own entry; someone else's entry stays hidden", async () => {
    const c1Sid = await login('c1');
    const c2Sid = await login('c2');
    const tellerSid = await login('teller1');
    await join(c1Sid, 'D').expect(201);
    const second = await join(c2Sid, 'D').expect(201);

    const own = await request(server())
      .get(`/api/entries/${second.body.id}`)
      .set('Cookie', `sid=${c2Sid}`)
      .expect(200);
    expect(own.body.displayNumber).toBe('D002');
    expect(own.body.peopleAhead).toBe(1);

    const other = await request(server()).get(`/api/entries/${second.body.id}`).set('Cookie', `sid=${c1Sid}`).expect(404);
    expect(other.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
    expect(JSON.stringify(other.body)).not.toMatch(/D002|displayNumber|WAITING/);

    const operator = await request(server())
      .get(`/api/entries/${second.body.id}`)
      .set('Cookie', `sid=${tellerSid}`)
      .expect(403);
    expect(operator.body.error.code).toBe('FORBIDDEN');
  });

  it("TEST-16 / AC-16: a bad id is not found, and my entries are only today's own tickets", async () => {
    const sid = await login('c1');
    const bad = await request(server()).get('/api/entries/not-a-uuid').set('Cookie', `sid=${sid}`).expect(404);
    expect(bad.body.error.code).toBe('NOT_FOUND');

    const today = await join(sid, 'D').expect(201);
    await join(await login('c2'), 'D').expect(201);
    const dId = await queueId('D');
    await insertEntry(dId, '2026-11-05', 1, 'D001', c1.id);

    const mine = await request(server()).get('/api/me/entries').set('Cookie', `sid=${sid}`).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(today.body.id);
    expect(mine.body[0].displayNumber).toBe('D001');
  });

  it('TEST-17 / AC-17: an operator cannot join a queue or read customer tickets', async () => {
    const sid = await login('teller1');
    const joinRes = await join(sid, 'D').expect(403);
    const listRes = await request(server()).get('/api/me/entries').set('Cookie', `sid=${sid}`).expect(403);
    expect(joinRes.body.error.code).toBe('FORBIDDEN');
    expect(listRes.body.error.code).toBe('FORBIDDEN');

    const entries = await db.query(`SELECT count(*)::int AS n FROM queue_entries`);
    expect(entries[0].n).toBe(0);
  });

  async function insertEntry(
    qId: string,
    queueDate: string,
    seq: number,
    displayNumber: string,
    customerId: string,
  ): Promise<void> {
    await db.query(
      `INSERT INTO queue_entries
         (queue_id, queue_date, seq, display_number, customer_id, lane, status, joined_at)
       VALUES ($1, $2, $3, $4, $5, 'REGULAR', 'WAITING', $6)`,
      [qId, queueDate, seq, displayNumber, customerId, DEFAULT_TEST_TIME],
    );
  }
});
