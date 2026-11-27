import { Lane } from './queue-entry';

/** Default minimum age (years on Bangkok queue date) for the PRIORITY lane (F-09, BR-15). */
export const DEFAULT_PRIORITY_AGE = 60;

/** Parses PRIORITY_AGE: an integer >= 1, otherwise the default (60). */
export function parsePriorityAge(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_PRIORITY_AGE;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_PRIORITY_AGE;
}

/**
 * Computes completed years of age on `queueDate` (both `YYYY-MM-DD`, Bangkok calendar).
 * Pure function; `queueDate` comes from `IClock.today()` rather than `new Date()`.
 */
export function ageOn(dateOfBirth: string, queueDate: string): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const [queueYear, queueMonth, queueDay] = queueDate.split('-').map(Number);
  let age = queueYear - birthYear;
  if (queueMonth < birthMonth || (queueMonth === birthMonth && queueDay < birthDay)) {
    age -= 1;
  }
  return age;
}

/**
 * F-09 (BR-15): server-side lane assignment from customer date of birth and Bangkok queue date.
 * Missing date of birth defaults to REGULAR.
 */
export function laneFor(
  dateOfBirth: string | null,
  queueDate: string,
  priorityAge: number = DEFAULT_PRIORITY_AGE,
): Lane {
  if (!dateOfBirth) return 'REGULAR';
  return ageOn(dateOfBirth, queueDate) >= priorityAge ? 'PRIORITY' : 'REGULAR';
}
