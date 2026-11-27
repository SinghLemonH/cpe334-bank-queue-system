import {
  DEFAULT_PRIORITY_STREAK_LIMIT,
  parsePriorityStreakLimit,
  PriorityOrderingPolicy,
} from '../../src/domain/ordering/priority-ordering-policy';

/** UT-08 / AC-57, AC-58: priority-first ordering with anti-starvation streak limit. */
describe('UT-08 PriorityOrderingPolicy', () => {
  const policy = new PriorityOrderingPolicy(3);

  it('UT-08: chooses PRIORITY when both lanes are waiting and streak is under limit', () => {
    expect(policy.chooseLane({ recentCalledLanes: [], waiting: { REGULAR: true, PRIORITY: true } })).toBe('PRIORITY');
    expect(policy.chooseLane({ recentCalledLanes: ['PRIORITY'], waiting: { REGULAR: true, PRIORITY: true } })).toBe(
      'PRIORITY',
    );
    expect(
      policy.chooseLane({
        recentCalledLanes: ['PRIORITY', 'PRIORITY'],
        waiting: { REGULAR: true, PRIORITY: true },
      }),
    ).toBe('PRIORITY');
  });

  it('UT-08: chooses REGULAR when PRIORITY streak reached limit and REGULAR is waiting (anti-starvation)', () => {
    expect(
      policy.chooseLane({
        recentCalledLanes: ['PRIORITY', 'PRIORITY', 'PRIORITY'],
        waiting: { REGULAR: true, PRIORITY: true },
      }),
    ).toBe('REGULAR');
  });

  it('UT-08: resets streak once a REGULAR call is most recent', () => {
    expect(
      policy.chooseLane({
        recentCalledLanes: ['REGULAR', 'PRIORITY', 'PRIORITY'],
        waiting: { REGULAR: true, PRIORITY: true },
      }),
    ).toBe('PRIORITY');
  });

  it('UT-08: chooses PRIORITY when streak reached limit but only PRIORITY is waiting', () => {
    expect(
      policy.chooseLane({
        recentCalledLanes: ['PRIORITY', 'PRIORITY', 'PRIORITY'],
        waiting: { REGULAR: false, PRIORITY: true },
      }),
    ).toBe('PRIORITY');
  });

  it('UT-08: chooses REGULAR when only REGULAR is waiting, and null when queue is empty', () => {
    expect(policy.chooseLane({ recentCalledLanes: [], waiting: { REGULAR: true, PRIORITY: false } })).toBe('REGULAR');
    expect(policy.chooseLane({ recentCalledLanes: [], waiting: { REGULAR: false, PRIORITY: false } })).toBeNull();
  });

  it('UT-08: parses PRIORITY_STREAK_LIMIT safely with default fallback', () => {
    expect(DEFAULT_PRIORITY_STREAK_LIMIT).toBe(3);
    expect(parsePriorityStreakLimit(undefined)).toBe(3);
    expect(parsePriorityStreakLimit('')).toBe(3);
    expect(parsePriorityStreakLimit('0')).toBe(3);
    expect(parsePriorityStreakLimit('-2')).toBe(3);
    expect(parsePriorityStreakLimit('abc')).toBe(3);
    expect(parsePriorityStreakLimit('2')).toBe(2);
  });
});
