import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase } from './test-db';
import { DEFAULT_TEST_TIME, sidFrom } from './test-app';

/**
 * Shared Sprint 2 fixture `FX` (docs/sprints/sprint-2/sts.md 1.1): queues D, L, O (open);
 * teller1, teller2 -> D; loanofficer1 -> L; customers c1, c2, c3.
 */
export const PASSWORD = 'test_password_123';
export const TODAY = '2026-11-06';
export const YESTERDAY = '2026-11-05';
export const RANDOM_UUID = '00000000-0000-4000-8000-000000000000';

export type Status = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'EXPIRED';

export interface EntryOptions {
  status?: Status;
  operator?: string;
  queueDate?: string;
  /** Defaults to DEFAULT_TEST_TIME for every timestamp that the status implies. */
  at?: Date;
}

export class Fixture {
  readonly users: Record<string, string> = {};
  private passwordHash = '';

  constructor(
    private readonly db: DataSource,
    private readonly server: () => unknown,
  ) {}

  async reset(): Promise<void> {
    if (!this.passwordHash) this.passwordHash = await PasswordHasher.hash(PASSWORD);
    await clearDatabase(this.db);
    for (const name of ['c1', 'c2', 'c3']) this.users[name] = await this.insertUser(name, 'CUSTOMER');
    for (const name of ['teller1', 'teller2', 'loanofficer1']) this.users[name] = await this.insertUser(name, 'OPERATOR');
    await this.db.query(
      `INSERT INTO queues (code, name, is_open) VALUES
         ('D', 'Deposit & Withdrawal', true), ('L', 'Loans', true), ('O', 'Account Opening', true)`,
    );
    await this.db.query(
      `INSERT INTO operator_queue_assignment (operator_id, queue_id)
       SELECT u.id, q.id FROM users u JOIN queues q ON
         (u.username IN ('teller1', 'teller2') AND q.code = 'D') OR (u.username = 'loanofficer1' AND q.code = 'L')`,
    );
  }

  private async insertUser(username: string, role: 'CUSTOMER' | 'OPERATOR'): Promise<string> {
    const rows = await this.db.query(
      `INSERT INTO users (username, password_hash, display_name, role, date_of_birth)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, this.passwordHash, username, role, role === 'CUSTOMER' ? '1990-01-01' : null],
    );
    return rows[0].id as string;
  }

  async login(username: string): Promise<string> {
    const res = await request(this.server() as never)
      .post('/api/auth/login')
      .send({ username, password: PASSWORD })
      .expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    if (!sid) throw new Error(`no session cookie for ${username}`);
    return sid;
  }

  /** Inserts an entry directly. Timestamps follow the status so the row is realistic. */
  async insertEntry(code: string, seq: number, customer: string, opts: EntryOptions = {}): Promise<string> {
    const status = opts.status ?? 'WAITING';
    const at = opts.at ?? DEFAULT_TEST_TIME;
    const called = status !== 'WAITING' && !(status === 'CANCELLED' && !opts.operator) && !(status === 'EXPIRED' && !opts.operator);
    const started = status === 'SERVING' || status === 'COMPLETED';
    const ended = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(status);
    const rows = await this.db.query(
      `INSERT INTO queue_entries
         (queue_id, queue_date, seq, display_number, customer_id, lane, status, operator_id,
          joined_at, called_at, started_at, ended_at)
       SELECT q.id, $2, $3, $4, $5, 'REGULAR', $6, $7, $8, $9, $10, $11
       FROM queues q WHERE q.code = $1
       RETURNING id`,
      [
        code,
        opts.queueDate ?? TODAY,
        seq,
        `${code}${String(seq).padStart(3, '0')}`,
        this.users[customer],
        status,
        opts.operator ? this.users[opts.operator] : null,
        at,
        called ? at : null,
        started ? at : null,
        ended ? at : null,
      ],
    );
    return rows[0].id as string;
  }

  /** Full row snapshot used for "row unchanged" assertions. */
  async row(id: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query(
      `SELECT status, operator_id, queue_date, joined_at, called_at, started_at, ended_at
       FROM queue_entries WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  post(sid: string | null, path: string) {
    const req = request(this.server() as never).post(path);
    return sid ? req.set('Cookie', `sid=${sid}`) : req;
  }

  patch(sid: string | null, path: string) {
    const req = request(this.server() as never).patch(path);
    return sid ? req.set('Cookie', `sid=${sid}`) : req;
  }

  get(sid: string | null, path: string) {
    const req = request(this.server() as never).get(path);
    return sid ? req.set('Cookie', `sid=${sid}`) : req;
  }
}

export function expectError(res: request.Response, status: number, code: string): void {
  expect({ status: res.status, code: res.body?.error?.code }).toEqual({ status, code });
  expect(Object.keys(res.body)).toEqual(['error']);
}
