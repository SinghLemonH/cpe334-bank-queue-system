import { InvalidTransitionError } from '../common/errors';
import { EntryStatus } from './queue-entry';

/** Every status in migration 001. */
export const ENTRY_STATUSES: readonly EntryStatus[] = [
  'WAITING',
  'CALLED',
  'SERVING',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
];

/** Operator service-desk actions from Sprint 1 (F-03 contract table 1.1, UT-01). */
export type OperatorAction = 'call' | 'start' | 'complete';
/** Sprint 2 transitions into terminal statuses (sprint-2 README 3.1, UT-06). */
export type LifecycleAction = 'cancel' | 'noShow' | 'expire';
export type EntryAction = OperatorAction | LifecycleAction;

export const ENTRY_ACTIONS: readonly OperatorAction[] = ['call', 'start', 'complete'];
export const LIFECYCLE_ACTIONS: readonly LifecycleAction[] = ['cancel', 'noShow', 'expire'];
export const ALL_ENTRY_ACTIONS: readonly EntryAction[] = [...ENTRY_ACTIONS, ...LIFECYCLE_ACTIONS];

/** The only allowed (from, action) pairs. Everything else is 409 INVALID_TRANSITION (BR-04). */
const TRANSITIONS: Record<EntryAction, { from: readonly EntryStatus[]; to: EntryStatus }> = {
  call: { from: ['WAITING'], to: 'CALLED' },
  start: { from: ['CALLED'], to: 'SERVING' },
  complete: { from: ['SERVING'], to: 'COMPLETED' },
  cancel: { from: ['WAITING', 'CALLED'], to: 'CANCELLED' },
  noShow: { from: ['CALLED'], to: 'NO_SHOW' },
  expire: { from: ['WAITING', 'CALLED'], to: 'EXPIRED' },
};

/** Statuses from which `action` is allowed. */
export function allowedFrom(action: EntryAction): readonly EntryStatus[] {
  return TRANSITIONS[action].from;
}

/** Status an entry must be in before a single-source action (call, start, complete, noShow). */
export function requiredStatus(action: EntryAction): EntryStatus {
  return TRANSITIONS[action].from[0];
}

export function canTransition(from: EntryStatus, action: EntryAction): boolean {
  return TRANSITIONS[action].from.includes(from);
}

/** Returns the status after `action`, or throws InvalidTransitionError. */
export function nextStatus(from: EntryStatus, action: EntryAction): EntryStatus {
  if (!canTransition(from, action)) {
    throw new InvalidTransitionError('This ticket has already changed. Refresh and try again.');
  }
  return TRANSITIONS[action].to;
}
