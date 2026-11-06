import { InvalidTransitionError } from '../../src/common/errors';
import { ENTRY_ACTIONS, ENTRY_STATUSES, EntryAction, nextStatus } from '../../src/domain/entry-status';
import { EntryStatus } from '../../src/domain/queue-entry';

/** UT-01 / AC-26: the Sprint 1 state machine (F-03 contract table 1.1). */
const ALLOWED: Array<[EntryStatus, EntryAction, EntryStatus]> = [
  ['WAITING', 'call', 'CALLED'],
  ['CALLED', 'start', 'SERVING'],
  ['SERVING', 'complete', 'COMPLETED'],
];

describe('UT-01 entry status transitions', () => {
  it('UT-01: covers 7 statuses x 3 actions', () => {
    expect(ENTRY_STATUSES).toHaveLength(7);
    expect(ENTRY_ACTIONS).toEqual(['call', 'start', 'complete']);
  });

  it.each(ALLOWED)('UT-01: %s + %s -> %s is allowed', (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to);
  });

  const rejected = ENTRY_STATUSES.flatMap((from) =>
    ENTRY_ACTIONS.filter((action) => !ALLOWED.some(([f, a]) => f === from && a === action)).map(
      (action) => [from, action] as [EntryStatus, EntryAction],
    ),
  );

  it('UT-01: exactly 18 pairs are rejected', () => {
    expect(rejected).toHaveLength(18);
  });

  it.each(rejected)('UT-01: %s + %s throws InvalidTransitionError', (from, action) => {
    expect(() => nextStatus(from, action)).toThrow(InvalidTransitionError);
  });
});
