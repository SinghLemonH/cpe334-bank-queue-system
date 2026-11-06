import { InvalidTransitionError } from '../common/errors';
import { EntryStatus } from './queue-entry';

/** Every status in migration 001 (Sprint 2 adds the transitions into the last three). */
export const ENTRY_STATUSES: readonly EntryStatus[] = [
  'WAITING',
  'CALLED',
  'SERVING',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
];

/** Operator actions in Sprint 1 (F-03 contract table 1.1). */
export type EntryAction = 'call' | 'start' | 'complete';
export const ENTRY_ACTIONS: readonly EntryAction[] = ['call', 'start', 'complete'];

/** The only allowed (from, action) pairs. Everything else is 409 INVALID_TRANSITION (BR-04). */
const TRANSITIONS: Record<EntryAction, { from: EntryStatus; to: EntryStatus }> = {
  call: { from: 'WAITING', to: 'CALLED' },
  start: { from: 'CALLED', to: 'SERVING' },
  complete: { from: 'SERVING', to: 'COMPLETED' },
};

/** Status an entry must be in before `action`. */
export function requiredStatus(action: EntryAction): EntryStatus {
  return TRANSITIONS[action].from;
}

export function canTransition(from: EntryStatus, action: EntryAction): boolean {
  return TRANSITIONS[action].from === from;
}

/** Returns the status after `action`, or throws InvalidTransitionError. */
export function nextStatus(from: EntryStatus, action: EntryAction): EntryStatus {
  if (!canTransition(from, action)) {
    throw new InvalidTransitionError('This ticket has already changed. Refresh and try again.');
  }
  return TRANSITIONS[action].to;
}
