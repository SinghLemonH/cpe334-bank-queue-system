import { ManualClock } from '../../src/common/clock';

/** UT-03 / AC-15 (STS 2.4). Bangkok is UTC+7 and does not observe daylight saving. */
describe('ManualClock.today', () => {
  it('UT-03: rolls the queue date at Asia/Bangkok midnight', () => {
    const before = new ManualClock(new Date('2026-11-06T16:59:59.000Z'));
    const after = new ManualClock(new Date('2026-11-06T17:00:00.000Z'));
    expect(before.today()).toBe('2026-11-06');
    expect(after.today()).toBe('2026-11-07');
  });
});
