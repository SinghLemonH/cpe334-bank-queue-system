import { QueryFailedError } from 'typeorm';
import { DuplicateActiveEntryError, OperatorBusyError } from '../common/errors';

interface PgDriverError {
  code?: string;
  constraint?: string;
}

/**
 * SA-8: map the partial unique indexes that enforce BR-02 (F-02) and BR-06 (F-03).
 * Any other 23505 is left untouched so the caller rethrows it (500), never swallowed.
 */
export function mapPgError(err: unknown): DuplicateActiveEntryError | OperatorBusyError | undefined {
  if (!(err instanceof QueryFailedError)) return undefined;
  const driver = err.driverError as PgDriverError;
  if (driver?.code !== '23505') return undefined;
  if (driver.constraint === 'uq_active_entry_per_customer') {
    return new DuplicateActiveEntryError('You already have an active ticket in this queue today.');
  }
  if (driver.constraint === 'uq_operator_active_entry') {
    return new OperatorBusyError('Finish your current customer before calling the next one.');
  }
  return undefined;
}
