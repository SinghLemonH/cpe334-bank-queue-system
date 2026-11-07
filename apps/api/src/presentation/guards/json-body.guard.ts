import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UnsupportedMediaTypeError } from '../../common/errors';

/**
 * CSRF stance (system SDS 5.5): endpoints that take a JSON body reject
 * any other Content-Type with 415, so a cross-site HTML form cannot call them.
 */
@Injectable()
export class JsonBodyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.is('application/json')) throw new UnsupportedMediaTypeError();
    return true;
  }
}
