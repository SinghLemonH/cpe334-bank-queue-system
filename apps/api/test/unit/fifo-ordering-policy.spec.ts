import { FifoOrderingPolicy } from '../../src/domain/ordering/fifo-ordering-policy';
import { Lane } from '../../src/domain/queue-entry';

/** UT-04 / AC-20: the Sprint 1 FIFO policy ignores lanes and recent calls. */
describe('UT-04 FifoOrderingPolicy', () => {
  const policy = new FifoOrderingPolicy();
  const recent: Array<[string, Lane[]]> = [
    ['none', []],
    ['one regular', ['REGULAR']],
    ['mixed', ['PRIORITY', 'PRIORITY', 'REGULAR']],
  ];

  it.each(recent)('UT-04: returns ANY, ANY, null whatever the recent calls (%s)', (_label, recentCalledLanes) => {
    expect(policy.chooseLane({ recentCalledLanes, waiting: { REGULAR: true, PRIORITY: false } })).toBe('ANY');
    expect(policy.chooseLane({ recentCalledLanes, waiting: { REGULAR: false, PRIORITY: true } })).toBe('ANY');
    expect(policy.chooseLane({ recentCalledLanes, waiting: { REGULAR: false, PRIORITY: false } })).toBeNull();
  });
});
