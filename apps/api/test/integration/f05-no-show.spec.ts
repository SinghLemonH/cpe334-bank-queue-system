import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { createTestApp, DEFAULT_TEST_TIME } from '../helpers/test-app';
import { getTestDataSource } from '../helpers/test-db';
import { expectError, Fixture, RANDOM_UUID } from '../helpers/fixture';

/**
 * F-05 No-show - API/integration tests TEST-37..TEST-40.
 * Contract: docs/sprints/sprint-2/README.md 4.3; STS 2.2. TEST-38 is the TDD test (BR-12).
 */
describe('F-05 No-show (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let fx: Fixture;
  const at = (ms: number) => new Date(DEFAULT_TEST_TIME.getTime() + ms);

  beforeAll(async () => {
    db = await getTestDataSource();
    ({ app, clock } = await createTestApp());
    fx = new Fixture(db, () => app.getHttpServer());
  });

  beforeEach(async () => {
    clock.setTime(DEFAULT_TEST_TIME);
    await fx.reset();
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  const noShow = (sid: string | null, id: string) => fx.post(sid, `/api/entries/${id}/no-show`);

  it('TEST-37 / AC-37: the calling operator marks no-show exactly at the end of the grace period', async () => {
    const id = await fx.insertEntry('D', 1, 'c1', { status: 'CALLED', operator: 'teller1' });
    await fx.insertEntry('D', 2, 'c2');
    const sid = await fx.login('teller1');
    clock.setTime(at(120_000));

    const res = await noShow(sid, id).expect(200);
    expect(res.body.status).toBe('NO_SHOW');
    expect(res.body.endedAt).toBe(at(120_000).toISOString());
    expect((await fx.row(id)).status).toBe('NO_SHOW');

    const next = await fx.post(sid, '/api/queues/D/call-next');
    expect(next.status).toBe(200);
    expect(next.body.displayNumber).toBe('D002');
  });

  it('TEST-38 / AC-38: rejects no-show 1 second before the grace period ends and leaves the row unchanged', async () => {
    const id = await fx.insertEntry('D', 1, 'c1', { status: 'CALLED', operator: 'teller1' });
    const before = await fx.row(id);
    const sid = await fx.login('teller1');
    clock.setTime(at(119_000));

    expectError(await noShow(sid, id), 409, 'NO_SHOW_TOO_EARLY');
    expect(await fx.row(id)).toEqual(before);
  });

  it('TEST-39 / AC-39: only the calling operator of an assigned queue may mark no-show', async () => {
    const id = await fx.insertEntry('D', 1, 'c1', { status: 'CALLED', operator: 'teller1' });
    const before = await fx.row(id);
    clock.setTime(at(180_000));

    expectError(await noShow(await fx.login('teller2'), id), 403, 'NOT_ENTRY_OWNER');
    expectError(await noShow(await fx.login('loanofficer1'), id), 403, 'FORBIDDEN');
    expectError(await noShow(await fx.login('c1'), id), 403, 'FORBIDDEN');
    expectError(await noShow(null, id), 401, 'UNAUTHENTICATED');
    expect(await fx.row(id)).toEqual(before);
  });

  it('TEST-39 / AC-39: a malformed or unknown id returns 404', async () => {
    const sid = await fx.login('teller1');
    expectError(await noShow(sid, 'not-a-uuid'), 404, 'NOT_FOUND');
    expectError(await noShow(sid, RANDOM_UUID), 404, 'NOT_FOUND');
  });

  it('TEST-40 / AC-40: no-show on a WAITING, SERVING or COMPLETED entry returns 409 INVALID_TRANSITION', async () => {
    const waiting = await fx.insertEntry('D', 1, 'c1');
    const serving = await fx.insertEntry('D', 2, 'c2', { status: 'SERVING', operator: 'teller1' });
    const completed = await fx.insertEntry('D', 3, 'c3', { status: 'COMPLETED', operator: 'teller1' });
    const sid = await fx.login('teller1');
    clock.setTime(at(600_000));

    for (const id of [waiting, serving, completed]) {
      const before = await fx.row(id);
      expectError(await noShow(sid, id), 409, 'INVALID_TRANSITION');
      expect(await fx.row(id)).toEqual(before);
    }
  });
});
