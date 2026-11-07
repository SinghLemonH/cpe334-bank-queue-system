/** Statuses that still occupy the customer's one active slot (BR-02, D-03). */
export const ACTIVE_STATUSES = ['WAITING', 'CALLED', 'SERVING'] as const;

export type EntryStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export type Lane = 'REGULAR' | 'PRIORITY';

/**
 * peopleAhead counts WAITING entries ahead of this one.
 * The key is always present, but the value is null once the entry is no longer WAITING (A-06).
 */
export function peopleAheadValue(status: string, waitingWithLowerSeq: number): number | null {
  return status === 'WAITING' ? waitingWithLowerSeq : null;
}
