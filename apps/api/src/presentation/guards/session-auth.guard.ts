import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../../application/auth.service';
import { AuthenticatedRequest, SESSION_COOKIE } from '../decorators/current-user.decorator';

/**
 * Guard 1 of 3 (F-01 contract 1.2): resolves the user only from the `sid` cookie.
 * Missing, unknown or expired session -> 401 UNAUTHENTICATED.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = req.cookies?.[SESSION_COOKIE];
    req.user = await this.auth.authenticate(token);
    req.sessionToken = token;
    return true;
  }
}
