import { Lane } from '../queue-entry';

/** What the policy may look at when an operator presses Call next (F-03 contract 6). */
export interface CallContext {
  /** Lanes of the most recent calls in this queue today, newest first (used by the S3 priority policy). */
  recentCalledLanes: Lane[];
  waiting: { REGULAR: boolean; PRIORITY: boolean };
}

/**
 * Chooses which lane the next call takes from. `'ANY'` = lowest seq regardless of lane,
 * `null` = nothing to call. Sprint 3 adds PriorityOrderingPolicy behind the same interface.
 */
export interface QueueOrderingPolicy {
  chooseLane(ctx: CallContext): Lane | 'ANY' | null;
}

export const QUEUE_ORDERING_POLICY = 'QueueOrderingPolicy';
