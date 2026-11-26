/**
 * BR-12 (F-05 contract, docs/sprints/sprint-2/README.md 4.3): an operator may mark a CALLED
 * entry NO_SHOW only once the grace period since `called_at` has passed. Exactly
 * `calledAt + grace` is allowed. Pure functions; "now" is passed in from the Clock (D-20).
 */
export function noShowAllowedAt(calledAt: Date, graceMinutes: number): Date {
  return new Date(calledAt.getTime() + graceMinutes * 60_000);
}

export function isNoShowAllowed(calledAt: Date, now: Date, graceMinutes: number): boolean {
  return now.getTime() >= noShowAllowedAt(calledAt, graceMinutes).getTime();
}

/** Default grace period (SRS Q-02, still open). */
export const DEFAULT_NO_SHOW_GRACE_MINUTES = 2;

/** Parses NO_SHOW_GRACE_MINUTES: an integer >= 0, otherwise the default. */
export function parseGraceMinutes(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_NO_SHOW_GRACE_MINUTES;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_NO_SHOW_GRACE_MINUTES;
}
