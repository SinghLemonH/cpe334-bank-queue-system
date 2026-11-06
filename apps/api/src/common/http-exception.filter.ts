import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from './errors';

// Code name from the Sprint 1 contract (docs/sprints/sprint-1/README.md 3.3).
const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';
const INTERNAL_ERROR_MESSAGE = 'Internal server error';

const HTTP_ERROR_CODES: Record<number, string> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = INTERNAL_ERROR_CODE;
    let message = INTERNAL_ERROR_MESSAGE;

    if (exception instanceof DomainError) {
      status = exception.statusCode;
      code = exception.errorCode;
      message = exception.message;
    } else if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_FAILED';
      const body = exception.getResponse() as { message?: string | string[] };
      message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? 'Invalid request');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (status >= 500) {
        // 5xx: the message may carry internal details. Log it, return a generic body.
        code = INTERNAL_ERROR_CODE;
        message = INTERNAL_ERROR_MESSAGE;
        this.logger.error(exception.stack ?? exception.message);
      } else {
        code = HTTP_ERROR_CODES[status] ?? 'HTTP_ERROR';
        message = exception.message;
      }
    } else {
      // Unknown error: log details server-side only, never send them to the client.
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }

    response.status(status).json({ error: { code, message } });
  }
}
