import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ManualClock } from '../../src/common/clock';
import { createTestApp, DEFAULT_TEST_TIME } from '../helpers/test-app';
import { getTestDataSource } from '../helpers/test-db';
import { expectError, Fixture, YESTERDAY } from '../helpers/fixture';

/**
 * F-08 Queue open/close and end-of-day - API/integration tests TEST-50..TEST-53.
 * Contract: docs/sprints/sprint-2/README.md 4.6; STS 2.6.
 */
describe('F-08 Queue open/close and end-of-day (integration)', () => {
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

  const setOpen = (sid: string | null, code: string, body: object) => fx.patch(sid, `/api/queues/${code}`).send(body);
  const endDay = (sid: string | null, code: string) => fx.post(sid, `/api/queues/${code}/end-day`);
  const join = (sid: string, code: string) => fx.post(sid, `/api/queues/${code}/entries`);

  it('TEST-50 / AC-50: a closed queue rejects joins; reopening accepts them again', async () => {
    const teller1 = await fx.login('teller1');
    const c1 = await fx.login('c1');

    const closed = await setOpen(teller1, 'D', { isOpen: false }).expect(200);
    expect(closed.body).toEqual({ code: 'D', name: 'Deposit & Withdrawal', isOpen: false, waitingCount: 0 });
    expectError(await join(c1, 'D'), 409, 'QUEUE_CLOSED');
    const list = await fx.get(c1, '/api/queues').expect(200);
    expect(list.body.find((q: { code: string }) => q.code === 'D').isOpen).toBe(false);

    await setOpen(teller1, 'D', { isOpen: false }).expect(200); // idempotent
    expect((await setOpen(teller1, 'D', { isOpen: true }).expect(200)).body.isOpen).toBe(true);
    expect((await join(c1, 'D').expect(201)).body.displayNumber).toBe('D001');
  });

  it('TEST-51 / AC-51: entries already in a closed queue can still be called, started and completed', async () => {
    const id = await fx.insertEntry('D', 1, 'c1');
    const teller1 = await fx.login('teller1');
    await setOpen(teller1, 'D', { isOpen: false }).expect(200);

    expect((await fx.post(teller1, '/api/queues/D/call-next').expect(200)).body.id).toBe(id);
    await fx.post(teller1, `/api/entries/${id}/start`).expect(200);
    expect((await fx.post(teller1, `/api/entries/${id}/complete`).expect(200)).body.status).toBe('COMPLETED');
  });

  it("TEST-52 / AC-52: end-of-day expires today's WAITING and CALLED entries only, closes the queue and frees the operator", async () => {
    await fx.addCustomer('c4');
    const yesterday = await fx.insertEntry('D', 1, 'c3', {
      queueDate: YESTERDAY,
      at: new Date(DEFAULT_TEST_TIME.getTime() - 86_400_000),
    });
    const waiting1 = await fx.insertEntry('D', 1, 'c1');
    const waiting2 = await fx.insertEntry('D', 2, 'c2');
    const called = await fx.insertEntry('D', 3, 'c3', { status: 'CALLED', operator: 'teller1' });
    const serving = await fx.insertEntry('D', 4, 'c4', { status: 'SERVING', operator: 'teller2' });
    const completed = await fx.insertEntry('D', 5, 'c1', { status: 'COMPLETED', operator: 'teller2' });
    const untouched = await Promise.all([yesterday, serving, completed].map((id) => fx.row(id)));

    const teller1 = await fx.login('teller1');
    clock.advanceMinutes(30);
    const res = await endDay(teller1, 'D').expect(200);
    expect(res.body).toEqual({
      queue: { code: 'D', name: 'Deposit & Withdrawal', isOpen: false, waitingCount: 0 },
      expiredCount: 3,
    });

    for (const id of [waiting1, waiting2, called]) {
      const row = await fx.row(id);
      expect(row.status).toBe('EXPIRED');
      expect(new Date(row.ended_at as string).toISOString()).toBe(clock.now().toISOString());
    }
    expect(await Promise.all([yesterday, serving, completed].map((id) => fx.row(id)))).toEqual(untouched);
    expect((await fx.get(teller1, '/api/operator/current-entry').expect(200)).body).toEqual({ entry: null });
  });

  it('TEST-53 / AC-53: roles, assignment, body validation and unknown queues', async () => {
    const loanofficer1 = await fx.login('loanofficer1');
    const c1 = await fx.login('c1');
    const teller1 = await fx.login('teller1');

    expectError(await setOpen(loanofficer1, 'D', { isOpen: false }), 403, 'FORBIDDEN');
    expectError(await endDay(loanofficer1, 'D'), 403, 'FORBIDDEN');
    expectError(await setOpen(c1, 'D', { isOpen: false }), 403, 'FORBIDDEN');
    expectError(await endDay(c1, 'D'), 403, 'FORBIDDEN');
    expectError(await setOpen(null, 'D', { isOpen: false }), 401, 'UNAUTHENTICATED');

    expectError(await setOpen(teller1, 'D', {}), 400, 'VALIDATION_FAILED');
    expectError(await setOpen(teller1, 'D', { isOpen: 'no' }), 400, 'VALIDATION_FAILED');
    expectError(await setOpen(teller1, 'D', { isOpen: true, extra: 1 }), 400, 'VALIDATION_FAILED');
    expectError(await setOpen(teller1, 'Z', { isOpen: false }), 404, 'NOT_FOUND');
    expectError(await endDay(teller1, 'Z'), 404, 'NOT_FOUND');

    const queues = await db.query(`SELECT is_open FROM queues WHERE code = 'D'`);
    expect(queues[0].is_open).toBe(true);
  });
});
