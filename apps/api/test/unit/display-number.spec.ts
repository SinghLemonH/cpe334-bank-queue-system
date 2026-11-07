import { formatDisplayNumber } from '../../src/domain/display-number';

/** UT-02 / AC-15 (STS 2.4). */
describe('formatDisplayNumber', () => {
  it('UT-02: pads sequences under 1000 and keeps 4+ digits', () => {
    expect(formatDisplayNumber('D', 1)).toBe('D001');
    expect(formatDisplayNumber('D', 10)).toBe('D010');
    expect(formatDisplayNumber('L', 999)).toBe('L999');
    expect(formatDisplayNumber('D', 1000)).toBe('D1000');
  });
});
