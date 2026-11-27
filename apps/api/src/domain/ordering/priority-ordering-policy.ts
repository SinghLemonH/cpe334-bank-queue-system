import { Lane } from '../queue-entry';
import { CallContext, QueueOrderingPolicy } from './queue-ordering-policy';

/** Default consecutive PRIORITY calls before one REGULAR call when both lanes wait (F-09, BR-14). */
export const DEFAULT_PRIORITY_STREAK_LIMIT = 3;

/** Parses PRIORITY_STREAK_LIMIT: an integer >= 1, otherwise the default (3). */
export function parsePriorityStreakLimit(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_PRIORITY_STREAK_LIMIT;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_PRIORITY_STREAK_LIMIT;
}

/**
 * F-09 (BR-14): calls PRIORITY before REGULAR, with an anti-starvation cap.
 * After `streakLimit` consecutive PRIORITY calls, calls one REGULAR entry if one is waiting.
 */
export class PriorityOrderingPolicy implements QueueOrderingPolicy {
  constructor(
    private readonly streakLimit: number = parsePriorityStreakLimit(process.env.PRIORITY_STREAK_LIMIT),
  ) {}

  chooseLane(ctx: CallContext): Lane | 'ANY' | null {
    const { REGULAR: hasRegular, PRIORITY: hasPriority } = ctx.waiting;
    if (!hasPriority && !hasRegular) return null;
    if (!hasPriority) return 'REGULAR';
    if (!hasRegular) return 'PRIORITY';

    const streakReached =
      ctx.recentCalledLanes.length >= this.streakLimit &&
      ctx.recentCalledLanes.slice(0, this.streakLimit).every((lane) => lane === 'PRIORITY');

    return streakReached ? 'REGULAR' : 'PRIORITY';
  }
}
