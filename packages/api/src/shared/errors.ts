import { FieldError } from './types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fieldErrors?: FieldError[];

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    fieldErrors?: FieldError[],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required or token expired', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to access or mutate this resource in your scope',
    code = 'FORBIDDEN',
  ) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    const msg = id ? `${resource} with ID '${id}' was not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request payload', fieldErrors?: FieldError[]) {
    super(message, 400, 'VALIDATION_ERROR', fieldErrors);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(message = 'Invalid state machine transition for this case and actor role') {
    super(message, 422, 'INVALID_TRANSITION');
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = 'Concurrent or conflicting mutation with the same idempotency key') {
    super(message, 409, 'IDEMPOTENCY_CONFLICT');
  }
}
