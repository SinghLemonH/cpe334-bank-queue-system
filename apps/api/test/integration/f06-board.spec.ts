import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME } from '../helpers/test-app';

/**
 * F-06 Public Board - API/integration tests TEST-47, TEST-48.
 * Contract: docs/sprints/sprint-2/README.md section 4.5, STS section 2.5.
 */
const PASSWORD = 'test_password_123';
const TODAY = '2026-11-06';
const YESTERDAY = '2026-11-05';

describe('F-06 Public board (integration)', () => {
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
    for (const name of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']) {
      users[name] = await insertUser(name, 'CUSTOMER');
    }
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
      [username, passwordHash, `Display ${username}`, role, role === 'CUSTOMER' ? '1990-01-01' : null],
    );
    return rows[0].id as string;
  }

  async function insertEntry(
    code: string,
    seq: number,
    customer: string,
    opts: {
      status?: string;
      operatorId?: string | null;
      counterId?: string | null;
      queueDate?: string;
      calledAt?: string | null;
    } = {},
  ): Promise<string> {
    const status = opts.status ?? 'WAITING';
    const operatorId = opts.operatorId === undefined ? null : opts.operatorId;
    const counterId = opts.counterId === undefined ? null : opts.counterId;
    const at = DEFAULT_TEST_TIME;
    const calledAt = opts.calledAt !== undefined ? opts.calledAt : status === 'WAITING' ? null : at;
    const rows = await db.query(
      `
      INSERT INTO queue_entries
        (queue_id, queue_date, seq, display_number, customer_id, lane, status, operator_id, counter_id,
         joined_at, called_at, started_at, ended_at)
      SELECT q.id, $2, $3, $4, $5, 'REGULAR', $6, $7, $8, $9, $10, $11, $12
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
        counterId,
        at,
        calledAt,
        status === 'SERVING' || status === 'COMPLETED' ? at : null,
        status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW' || status === 'EXPIRED' ? at : null,
      ],
    );
    return rows[0].id as string;
  }

  // ---------------------------------------------------------------------------
  // TEST-47 / AC-47: public board shows only today's CALLED/SERVING entries
  // ---------------------------------------------------------------------------

  it('TEST-47 / AC-47: GET /api/public/board shows today CALLED and SERVING entries with counter label, no session needed', async () => {
    // Today on D: 2 WAITING
    await insertEntry('D', 1, 'c1');
    await insertEntry('D', 2, 'c2');

    // 1 CALLED (K1) at 10:01
    await insertEntry('D', 3, 'c3', {
      status: 'CALLED',
      operatorId: users.teller1,
      counterId: counters.K1,
      calledAt: '2026-11-06T03:01:00.000Z',
    });

    // 1 SERVING (K2) at 10:02
    await insertEntry('D', 4, 'c4', {
      status: 'SERVING',
      operatorId: users.teller2,
      counterId: counters.K2,
      calledAt: '2026-11-06T03:02:00.000Z',
    });

    // 1 each of terminal statuses (COMPLETED, CANCELLED, NO_SHOW, EXPIRED)
    await insertEntry('D', 5, 'c5', { status: 'COMPLETED', operatorId: users.teller1 });
    await insertEntry('D', 6, 'c6', { status: 'CANCELLED' });
    await insertEntry('D', 7, 'c7', { status: 'NO_SHOW', operatorId: users.teller1 });
    await insertEntry('D', 8, 'c8', { status: 'EXPIRED' });

    // Yesterday on D: 1 CALLED (must NOT show)
    await insertEntry('D', 9, 'c1', {
      status: 'CALLED',
      queueDate: YESTERDAY,
      operatorId: users.teller1,
      counterId: counters.K1,
    });

    // Anonymous request (no cookies)
    const res = await request(server()).get('/api/public/board').expect(200);

    expect(res.body.generatedAt).toBe(DEFAULT_TEST_TIME.toISOString());
    expect(res.body.queues).toHaveLength(3);

    const dQueue = res.body.queues.find((q: { code: string }) => q.code === 'D');
    expect(dQueue).toBeDefined();
    expect(dQueue.name).toBe('Deposit & Withdrawal');
    expect(dQueue.isOpen).toBe(true);
    expect(dQueue.waitingCount).toBe(2);
    expect(dQueue.nowServing).toEqual([
      {
        displayNumber: 'D003',
        counterLabel: 'Counter 1',
        status: 'CALLED',
        lane: 'REGULAR',
      },
      {
        displayNumber: 'D004',
        counterLabel: 'Counter 2',
        status: 'SERVING',
        lane: 'REGULAR',
      },
    ]);

    // L and O queues listed with empty nowServing
    const lQueue = res.body.queues.find((q: { code: string }) => q.code === 'L');
    expect(lQueue.nowServing).toEqual([]);
    expect(lQueue.waitingCount).toBe(0);

    const oQueue = res.body.queues.find((q: { code: string }) => q.code === 'O');
    expect(oQueue.nowServing).toEqual([]);
    expect(oQueue.waitingCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // TEST-48 / AC-48: NFR-05 exact key set and PII-free response
  // ---------------------------------------------------------------------------

  it('TEST-48 / AC-48: NFR-05 exact keys, Cache-Control: no-store, and no personal data or UUIDs in JSON', async () => {
    await insertEntry('D', 1, 'c1', {
      status: 'CALLED',
      operatorId: users.teller1,
      counterId: counters.K1,
    });

    const res = await request(server()).get('/api/public/board').expect(200);

    // Cache-Control header
    expect(res.headers['cache-control']).toBe('no-store');

    // Exact top-level keys
    expect(Object.keys(res.body).sort()).toEqual(['generatedAt', 'queues'].sort());

    // Exact queue keys
    const dQueue = res.body.queues.find((q: { code: string }) => q.code === 'D');
    expect(Object.keys(dQueue).sort()).toEqual(
      ['code', 'name', 'isOpen', 'waitingCount', 'nowServing'].sort(),
    );

    // Exact item keys
    const servingItem = dQueue.nowServing[0];
    expect(Object.keys(servingItem).sort()).toEqual(
      ['displayNumber', 'counterLabel', 'status', 'lane'].sort(),
    );

    // Check raw text: no UUID, no username, no display name
    const rawText = res.text;
    expect(rawText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    for (const name of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'teller1', 'teller2', 'loanofficer1']) {
      expect(rawText).not.toContain(`"${name}"`);
      expect(rawText).not.toContain(`Display ${name}`);
    }
  });
});
