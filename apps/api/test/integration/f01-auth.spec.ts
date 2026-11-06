import { createHash, randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { PasswordHasher } from '../../src/infrastructure/password-hasher';
import { clearDatabase, createTestUser, getTestDataSource } from '../helpers/test-db';
import { createTestApp, DEFAULT_TEST_TIME, sidFrom } from '../helpers/test-app';
import { PROTECTED_ENDPOINTS } from '../helpers/protected-endpoints';

/**
 * F-01 Auth & RBAC - API/integration tests TEST-01..TEST-07
 * Contract: docs/sprints/sprint-1/F-01-auth.md v1, STS section 2.1
 */
const PASSWORD = 'test_password_123';
const TTL_HOURS = 8;
const HOUR = 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('F-01 Auth & RBAC (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let c1: { id: string; username: string; role: string };

  beforeAll(async () => {
    db = await getTestDataSource();
    ({ app, clock } = await createTestApp());
  });

  beforeEach(async () => {
    clock.setTime(DEFAULT_TEST_TIME);
    await clearDatabase(db);
    c1 = await createTestUser(db, {
      username: 'c1',
      role: 'CUSTOMER',
      displayName: 'Customer One',
      password: PASSWORD,
    });
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  const server = () => app.getHttpServer();

  async function login(username = 'c1', password = PASSWORD): Promise<string> {
    const res = await request(server()).post('/api/auth/login').send({ username, password }).expect(200);
    const sid = sidFrom(res.headers['set-cookie']);
    expect(sid).toBeDefined();
    return sid as string;
  }

  async function sessionCount(): Promise<number> {
    const rows = await db.query('SELECT count(*)::int AS n FROM sessions');
    return rows[0].n;
  }

  describe('TEST-01 / AC-01: valid login', () => {
    it('TEST-01 / AC-01: returns 200, HttpOnly SameSite=Lax sid cookie and the user without the hash', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .send({ username: 'c1', password: PASSWORD })
        .expect(200);

      expect(res.body).toEqual({
        id: c1.id,
        username: 'c1',
        displayName: 'Customer One',
        role: 'CUSTOMER',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|password|hash|token/i);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const sidCookie = cookies.find((c) => c.startsWith('sid='));
      expect(sidCookie).toBeDefined();
      expect(sidCookie).toMatch(/HttpOnly/i);
      expect(sidCookie).toMatch(/SameSite=Lax/i);
      expect(sidCookie).toMatch(/Path=\//);
      expect(sidCookie).toMatch(new RegExp(`Max-Age=${TTL_HOURS * 3600}`));
      expect(sidCookie).not.toMatch(/Secure/i); // COOKIE_SECURE is not true in tests

      const token = sidFrom(cookies) as string;
      const rows = await db.query('SELECT user_id, token_hash, expires_at FROM sessions');
      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(c1.id);
      expect(rows[0].token_hash).toBe(sha256(token));
      expect(rows[0].token_hash).not.toBe(token);
      expect(new Date(rows[0].expires_at).toISOString()).toBe(
        new Date(DEFAULT_TEST_TIME.getTime() + TTL_HOURS * HOUR).toISOString(),
      );
    });

    it('TEST-01 / AC-01: rejects a non-JSON body with 415 and creates no session', async () => {
      const res = await request(server())
        .post('/api/auth/login')
        .type('form')
        .send(`username=c1&password=${PASSWORD}`)
        .expect(415);

      expect(res.body).toEqual({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: expect.any(String) } });
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(await sessionCount()).toBe(0);
    });
  });

  describe('TEST-02 / AC-02: invalid login', () => {
    it('TEST-02 / AC-02: wrong password and unknown user get the same 401 body and no cookie', async () => {
      const wrong = await request(server())
        .post('/api/auth/login')
        .send({ username: 'c1', password: 'wrong_password' })
        .expect(401);
      const unknown = await request(server())
        .post('/api/auth/login')
        .send({ username: 'nobody', password: PASSWORD })
        .expect(401);

      expect(wrong.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) } });
      expect(JSON.stringify(unknown.body)).toBe(JSON.stringify(wrong.body));
      expect(wrong.headers['set-cookie']).toBeUndefined();
      expect(unknown.headers['set-cookie']).toBeUndefined();
      expect(await sessionCount()).toBe(0);
    });

    it('TEST-02 / AC-02: missing or extra fields get 400 VALIDATION_FAILED and no session', async () => {
      const missing = await request(server()).post('/api/auth/login').send({ username: 'c1' }).expect(400);
      const extra = await request(server())
        .post('/api/auth/login')
        .send({ username: 'c1', password: PASSWORD, role: 'OPERATOR' })
        .expect(400);

      expect(missing.body.error.code).toBe('VALIDATION_FAILED');
      expect(extra.body.error.code).toBe('VALIDATION_FAILED');
      expect(await sessionCount()).toBe(0);
    });
  });

  describe('TEST-03 / AC-03: current user', () => {
    it('TEST-03 / AC-03: valid cookie returns the current user; no or garbage cookie returns 401', async () => {
      const sid = await login();

      const ok = await request(server()).get('/api/auth/me').set('Cookie', `sid=${sid}`).expect(200);
      expect(ok.body).toEqual({ id: c1.id, username: 'c1', displayName: 'Customer One', role: 'CUSTOMER' });
      expect(JSON.stringify(ok.body)).not.toMatch(/argon2|password|hash|dateOfBirth|date_of_birth/i);

      const none = await request(server()).get('/api/auth/me').expect(401);
      const garbage = await request(server()).get('/api/auth/me').set('Cookie', 'sid=garbage').expect(401);
      for (const res of [none, garbage]) {
        expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
      }
    });
  });

  describe('TEST-04 / AC-04: logout', () => {
    it('TEST-04 / AC-04: logout returns 204, deletes the session and the old cookie gets 401', async () => {
      const sid = await login();
      expect(await sessionCount()).toBe(1);

      const res = await request(server()).post('/api/auth/logout').set('Cookie', `sid=${sid}`).expect(204);
      expect(res.text).toBe('');
      const cleared = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('sid='));
      expect(cleared).toMatch(/^sid=;/);
      expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
      expect(await sessionCount()).toBe(0);

      const after = await request(server()).get('/api/auth/me').set('Cookie', `sid=${sid}`).expect(401);
      expect(after.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('TEST-05 / AC-05: session expiry', () => {
    it('TEST-05 / AC-05: an expired session returns 401 and its row is deleted', async () => {
      const sid = await login();
      clock.setTime(new Date(DEFAULT_TEST_TIME.getTime() + TTL_HOURS * HOUR + 60 * 1000));

      const res = await request(server()).get('/api/auth/me').set('Cookie', `sid=${sid}`).expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(await sessionCount()).toBe(0);
    });

    it('TEST-05 / AC-05: a session one minute before expiry is still valid', async () => {
      const sid = await login();
      clock.setTime(new Date(DEFAULT_TEST_TIME.getTime() + TTL_HOURS * HOUR - 60 * 1000));

      await request(server()).get('/api/auth/me').set('Cookie', `sid=${sid}`).expect(200);
      expect(await sessionCount()).toBe(1);
    });
  });

  describe('TEST-06 / AC-06: unauthenticated access', () => {
    it.each(PROTECTED_ENDPOINTS.map((e) => [e.method.toUpperCase(), e.path, e] as const))(
      'TEST-06 / AC-06: %s %s without a cookie returns 401 and only {error}',
      async (_m, _p, endpoint) => {
        const path = endpoint.path.replace(':id', randomUUID());
        const res = await request(server())[endpoint.method](path).expect(401);
        expect(Object.keys(res.body)).toEqual(['error']);
        expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
      },
    );
  });

  describe('TEST-07 / AC-07: password storage', () => {
    it('TEST-07 / AC-07: the stored password is an argon2id hash, not the plaintext', async () => {
      const rows = await db.query('SELECT password_hash FROM users WHERE id = $1', [c1.id]);
      const hash: string = rows[0].password_hash;

      expect(hash.startsWith('$argon2id$')).toBe(true);
      expect(hash).not.toBe(PASSWORD);
      expect(hash).not.toContain(PASSWORD);
      await expect(PasswordHasher.verify(hash, PASSWORD)).resolves.toBe(true);
      await expect(PasswordHasher.verify(hash, 'wrong_password')).resolves.toBe(false);
    });
  });
});
