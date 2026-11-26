import { QueryFailedError } from 'typeorm';
import { CounterBusyError, DuplicateActiveEntryError, OperatorBusyError } from '../common/errors';
import { DUPLICATE_ACTIVE_ENTRY_MESSAGE } from '../domain/queue-entry';

interface PgDriverError {
  code?: string;
  constraint?: string;
}

/**
 * SA-8: map the partial unique indexes that enforce BR-02 (F-02), BR-06 (F-03), and BR-13 (F-07).
 * Any other 23505 is left untouched so the caller rethrows it (500), never swallowed.
 */
export function mapPgError(
  err: unknown,
): DuplicateActiveEntryError | OperatorBusyError | CounterBusyError | undefined {
  if (!(err instanceof QueryFailedError)) return undefined;
  const driver = err.driverError as PgDriverError;
  if (driver?.code !== '23505') return undefined;
  if (driver.constraint === 'uq_active_entry_per_customer') {
    return new DuplicateActiveEntryError(DUPLICATE_ACTIVE_ENTRY_MESSAGE);
  }
  if (driver.constraint === 'uq_operator_active_entry') {
    return new OperatorBusyError('Finish your current customer before calling the next one.');
  }
  if (driver.constraint === 'uq_counter_active_entry') {
    return new CounterBusyError('This counter is already serving a customer. Choose another counter.');
  }
  return undefined;
}
