import { ageOn, DEFAULT_PRIORITY_AGE, laneFor, parsePriorityAge } from '../../src/domain/priority';

/** UT-07 / AC-55, BR-15: age boundary and server-side lane assignment on Bangkok queue date. */
describe('UT-07 priority age and laneFor', () => {
  const TODAY = '2026-11-06';

  it('UT-07: assigns PRIORITY on exact 60th birthday (s60) and REGULAR one day under 60 (s59)', () => {
    expect(ageOn('1966-11-06', TODAY)).toBe(60);
    expect(laneFor('1966-11-06', TODAY)).toBe('PRIORITY');

    expect(ageOn('1966-11-07', TODAY)).toBe(59);
    expect(laneFor('1966-11-07', TODAY)).toBe('REGULAR');
  });

  it('UT-07: handles leap-day birthdates cleanly', () => {
    expect(ageOn('1964-02-29', '2025-02-28')).toBe(60);
    expect(laneFor('1964-02-29', '2025-02-28')).toBe('PRIORITY');

    expect(ageOn('1964-02-29', '2024-02-28')).toBe(59);
    expect(laneFor('1964-02-29', '2024-02-28')).toBe('REGULAR');

    expect(ageOn('1964-02-29', '2024-02-29')).toBe(60);
    expect(laneFor('1964-02-29', '2024-02-29')).toBe('PRIORITY');
  });

  it('UT-07: matches seeded demo customer dates of birth and handles null DOB', () => {
    expect(laneFor('1948-03-15', TODAY)).toBe('PRIORITY');
    expect(laneFor('1995-07-02', TODAY)).toBe('REGULAR');
    expect(laneFor(null, TODAY)).toBe('REGULAR');
  });

  it('UT-07: parses PRIORITY_AGE safely with default fallback', () => {
    expect(DEFAULT_PRIORITY_AGE).toBe(60);
    expect(parsePriorityAge(undefined)).toBe(60);
    expect(parsePriorityAge('')).toBe(60);
    expect(parsePriorityAge('0')).toBe(60);
    expect(parsePriorityAge('-5')).toBe(60);
    expect(parsePriorityAge('sixty')).toBe(60);
    expect(parsePriorityAge('65')).toBe(65);
  });
});
