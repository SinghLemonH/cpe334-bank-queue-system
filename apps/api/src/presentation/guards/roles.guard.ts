import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenRoleError, UnauthorizedError } from '../../common/errors';
import { Role } from '../../infrastructure/entities/user.entity';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard 2 of 3: runs after SessionAuthGuard. Role not listed in @Roles() -> 403 FORBIDDEN.
 * Without @Roles() any signed-in user passes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedError();
    if (!roles.includes(user.role)) throw new ForbiddenRoleError();
    return true;
  }
}
