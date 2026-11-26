import { isNoShowAllowed, noShowAllowedAt } from '../../src/domain/no-show-rule';

/** UT-05 / AC-38 (TDD, BR-12): the no-show grace period boundary (docs/sprints/sprint-2/sts.md 2.2). */
describe('UT-05 no-show grace rule', () => {
  const calledAt = new Date('2026-11-06T03:00:00.000Z');
  const plus = (ms: number) => new Date(calledAt.getTime() + ms);

  it('UT-05: noShowAllowedAt is calledAt + grace minutes', () => {
    expect(noShowAllowedAt(calledAt, 2).toISOString()).toBe('2026-11-06T03:02:00.000Z');
  });

  it('UT-05: rejects 1 second before the 2-minute grace period ends', () => {
    expect(isNoShowAllowed(calledAt, plus(119_000), 2)).toBe(false);
  });

  it('UT-05: allows exactly at the end of the grace period', () => {
    expect(isNoShowAllowed(calledAt, plus(120_000), 2)).toBe(true);
  });

  it('UT-05: allows after the grace period', () => {
    expect(isNoShowAllowed(calledAt, plus(121_000), 2)).toBe(true);
  });

  it('UT-05: a grace of 0 allows immediately', () => {
    expect(isNoShowAllowed(calledAt, calledAt, 0)).toBe(true);
  });
});
