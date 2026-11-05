export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DuplicateActiveEntryError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'DUPLICATE_ACTIVE_ENTRY';
  constructor(message = 'Customer already holds an active entry in this queue today') {
    super(message);
  }
}

export class OperatorBusyError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'OPERATOR_BUSY';
  constructor(message = 'Operator already holds an active entry today') {
    super(message);
  }
}

export class NoWaitingEntryError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'NO_WAITING_ENTRY';
  constructor(message = 'No waiting entries available in this queue') {
    super(message);
  }
}

export class QueueClosedError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'QUEUE_CLOSED';
  constructor(message = 'This queue is currently closed') {
    super(message);
  }
}

export class InvalidTransitionError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'INVALID_TRANSITION';
  constructor(message = 'Requested status transition is not permitted') {
    super(message);
  }
}

export class NotEntryOwnerError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'NOT_ENTRY_OWNER';
  constructor(message = 'Only the operator who called this entry may modify it') {
    super(message);
  }
}

export class QueueNotAssignedError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'QUEUE_NOT_ASSIGNED';
  constructor(message = 'Operator is not assigned to this queue') {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenRoleError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN_ROLE';
  constructor(message = 'Operation forbidden for this role') {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
  constructor(message = 'Requested resource was not found') {
    super(message);
  }
}
