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

/** 403 FORBIDDEN: the operator is not assigned to the queue (contract SA-3, BR-05). */
export class QueueNotAssignedError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
  constructor(message = 'You are not assigned to this queue.') {
    super(message);
  }
}

/** 401 UNAUTHENTICATED: no cookie, unknown token or expired session (contract SA-2). */
export class UnauthorizedError extends DomainError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHENTICATED';
  constructor(message = 'Authentication required') {
    super(message);
  }
}

/** 401 INVALID_CREDENTIALS: same body for a wrong password and an unknown user (AC-02). */
export class InvalidCredentialsError extends DomainError {
  readonly statusCode = 401;
  readonly errorCode = 'INVALID_CREDENTIALS';
  constructor(message = 'Invalid username or password.') {
    super(message);
  }
}

/** 403 FORBIDDEN: the caller's role may not use this endpoint (contract SA-3). */
export class ForbiddenRoleError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
  constructor(message = 'Operation forbidden for this role') {
    super(message);
  }
}

/** 415 UNSUPPORTED_MEDIA_TYPE: a JSON-body endpoint received another content type. */
export class UnsupportedMediaTypeError extends DomainError {
  readonly statusCode = 415;
  readonly errorCode = 'UNSUPPORTED_MEDIA_TYPE';
  constructor(message = 'Content-Type must be application/json') {
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

/** 409 NO_SHOW_TOO_EARLY: no-show before the grace period has passed (F-05, BR-12, D-29). */
export class NoShowTooEarlyError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'NO_SHOW_TOO_EARLY';
  constructor(message = 'Please wait until the grace period has passed before marking no-show.') {
    super(message);
  }
}
