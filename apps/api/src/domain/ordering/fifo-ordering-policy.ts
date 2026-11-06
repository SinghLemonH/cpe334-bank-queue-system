import { CallContext, QueueOrderingPolicy } from './queue-ordering-policy';

/** Sprint 1 (BR-03): plain FIFO by seq. Lanes are ignored. */
export class FifoOrderingPolicy implements QueueOrderingPolicy {
  chooseLane(ctx: CallContext): 'ANY' | null {
    return ctx.waiting.REGULAR || ctx.waiting.PRIORITY ? 'ANY' : null;
  }
}
