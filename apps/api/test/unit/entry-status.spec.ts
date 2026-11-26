import { InvalidTransitionError } from '../../src/common/errors';
import { ALL_ENTRY_ACTIONS, ENTRY_ACTIONS, ENTRY_STATUSES, EntryAction, nextStatus } from '../../src/domain/entry-status';
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

/** UT-06 / AC-33, AC-40, AC-52: the full Sprint 2 state machine (sprint-2 README 3.1). */
const ALLOWED_V2: Array<[EntryStatus, EntryAction, EntryStatus]> = [
  ...ALLOWED,
  ['WAITING', 'cancel', 'CANCELLED'],
  ['CALLED', 'cancel', 'CANCELLED'],
  ['CALLED', 'noShow', 'NO_SHOW'],
  ['WAITING', 'expire', 'EXPIRED'],
  ['CALLED', 'expire', 'EXPIRED'],
];

describe('UT-06 entry status transitions v2', () => {
  it('UT-06: covers 7 statuses x 6 actions', () => {
    expect(ALL_ENTRY_ACTIONS).toEqual(['call', 'start', 'complete', 'cancel', 'noShow', 'expire']);
  });

  it.each(ALLOWED_V2)('UT-06: %s + %s -> %s is allowed', (from, action, to) => {
    expect(nextStatus(from, action)).toBe(to);
  });

  const rejectedV2 = ENTRY_STATUSES.flatMap((from) =>
    ALL_ENTRY_ACTIONS.filter((action) => !ALLOWED_V2.some(([f, a]) => f === from && a === action)).map(
      (action) => [from, action] as [EntryStatus, EntryAction],
    ),
  );

  it('UT-06: exactly 34 of the 42 pairs are rejected', () => {
    expect(rejectedV2).toHaveLength(34);
  });

  it.each(rejectedV2)('UT-06: %s + %s throws InvalidTransitionError', (from, action) => {
    expect(() => nextStatus(from, action)).toThrow(InvalidTransitionError);
  });
});
