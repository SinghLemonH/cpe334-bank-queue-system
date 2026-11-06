import { QueryFailedError } from 'typeorm';
import { DuplicateActiveEntryError } from '../common/errors';

interface PgDriverError {
  code?: string;
  constraint?: string;
}

/**
 * SA-8 (F-02): map the partial unique index that enforces BR-02.
 * Any other 23505 is left untouched so the caller rethrows it (500), never swallowed.
 * `uq_operator_active_entry` is mapped by F-03.
 */
export function mapPgError(err: unknown): DuplicateActiveEntryError | undefined {
  if (!(err instanceof QueryFailedError)) return undefined;
  const driver = err.driverError as PgDriverError;
  if (driver?.code !== '23505') return undefined;
  if (driver.constraint === 'uq_active_entry_per_customer') {
    return new DuplicateActiveEntryError('You already have an active ticket in this queue today.');
  }
  return undefined;
}
