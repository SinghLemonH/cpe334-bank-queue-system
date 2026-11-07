/**
 * D-01: display number is the queue code plus the daily sequence.
 * Sequences 1..999 are padded to 3 digits (D001). 1000 and above are shown in full (D1000).
 */
export function formatDisplayNumber(code: string, seq: number): string {
  const body = seq >= 1000 ? String(seq) : String(seq).padStart(3, '0');
  return `${code}${body}`;
}
