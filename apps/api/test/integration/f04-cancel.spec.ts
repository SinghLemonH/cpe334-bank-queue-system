import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { createTestApp, DEFAULT_TEST_TIME } from '../helpers/test-app';
import { getTestDataSource } from '../helpers/test-db';
import { expectError, Fixture, RANDOM_UUID } from '../helpers/fixture';

/**
 * F-04 Customer cancel - API/integration tests TEST-31..TEST-35.
 * Contract: docs/sprints/sprint-2/README.md 4.2; STS 2.1.
 */
describe('F-04 Customer cancel (integration)', () => {
  let app: INestApplication;
  let clock: ManualClock;
  let db: DataSource;
  let fx: Fixture;

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

  const cancel = (sid: string | null, id: string) => fx.post(sid, `/api/entries/${id}/cancel`);
  const join = (sid: string, code: string) => fx.post(sid, `/api/queues/${code}/entries`);

  it('TEST-31 / AC-31: the owner cancels a WAITING entry; it persists and later entries move up', async () => {
    const c1 = await fx.login('c1');
    const c2 = await fx.login('c2');
    const mine = (await join(c1, 'D').expect(201)).body.id as string;
    const theirs = (await join(c2, 'D').expect(201)).body.id as string;
    expect((await fx.get(c2, `/api/entries/${theirs}`).expect(200)).body.peopleAhead).toBe(1);

    clock.advanceMinutes(5);
    const res = await cancel(c1, mine).expect(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(res.body.endedAt).toBe(clock.now().toISOString());

    expect((await fx.get(c1, `/api/entries/${mine}`).expect(200)).body.status).toBe('CANCELLED');
    expect((await fx.row(mine)).status).toBe('CANCELLED');
    expect((await fx.get(c2, `/api/entries/${theirs}`).expect(200)).body.peopleAhead).toBe(0);
  });

  it('TEST-32 / AC-32: cancelling a CALLED entry frees the calling operator', async () => {
    const c1 = await fx.login('c1');
    const c2 = await fx.login('c2');
    const teller1 = await fx.login('teller1');
    const mine = (await join(c1, 'D').expect(201)).body.id as string;
    await join(c2, 'D').expect(201);
    expect((await fx.post(teller1, '/api/queues/D/call-next').expect(200)).body.id).toBe(mine);

    const res = await cancel(c1, mine).expect(200);
    expect(res.body.status).toBe('CANCELLED');

    expect((await fx.get(teller1, '/api/operator/current-entry').expect(200)).body).toEqual({ entry: null });
    const next = await fx.post(teller1, '/api/queues/D/call-next');
    expect(next.status).toBe(200);
    expect(next.body.displayNumber).toBe('D002');
  });

  it('TEST-33 / AC-33: SERVING, COMPLETED and CANCELLED entries cannot be cancelled', async () => {
    const serving = await fx.insertEntry('D', 1, 'c1', { status: 'SERVING', operator: 'teller1' });
    const completed = await fx.insertEntry('L', 1, 'c1', { status: 'COMPLETED', operator: 'loanofficer1' });
    const cancelled = await fx.insertEntry('O', 1, 'c1', { status: 'CANCELLED' });
    const sid = await fx.login('c1');

    for (const id of [serving, completed, cancelled]) {
      const before = await fx.row(id);
      expectError(await cancel(sid, id), 409, 'INVALID_TRANSITION');
      expect(await fx.row(id)).toEqual(before);
    }
  });

  it("TEST-34 / AC-34: another customer's entry is 404, an operator is 403, no session is 401", async () => {
    const id = await fx.insertEntry('D', 1, 'c1');
    const before = await fx.row(id);

    expectError(await cancel(await fx.login('c2'), id), 404, 'NOT_FOUND');
    expectError(await cancel(await fx.login('teller1'), id), 403, 'FORBIDDEN');
    expectError(await cancel(null, id), 401, 'UNAUTHENTICATED');
    expect(await fx.row(id)).toEqual(before);
  });

  it('TEST-34 / AC-34: a malformed or unknown id returns 404', async () => {
    const sid = await fx.login('c1');
    expectError(await cancel(sid, 'not-a-uuid'), 404, 'NOT_FOUND');
    expectError(await cancel(sid, RANDOM_UUID), 404, 'NOT_FOUND');
  });

  it('TEST-35 / AC-35: after cancelling, the customer can join the same queue again the same day', async () => {
    const sid = await fx.login('c1');
    const first = await join(sid, 'D').expect(201);
    expect(first.body.displayNumber).toBe('D001');
    await cancel(sid, first.body.id).expect(200);

    const second = await join(sid, 'D').expect(201);
    expect(second.body.displayNumber).toBe('D002');
    expect(second.body.status).toBe('WAITING');
  });
});
