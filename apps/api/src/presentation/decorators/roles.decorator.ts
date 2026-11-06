import { SetMetadata } from '@nestjs/common';
import { Role } from '../../infrastructure/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Roles allowed on a controller or handler; checked by RolesGuard (403 FORBIDDEN). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
