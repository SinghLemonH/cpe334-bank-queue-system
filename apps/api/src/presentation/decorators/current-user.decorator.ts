import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser as CurrentUserShape } from '../../application/auth.service';

export const SESSION_COOKIE = 'sid';

/** Request fields set by SessionAuthGuard. Identity never comes from body/query/headers. */
export interface AuthenticatedRequest {
  user?: CurrentUserShape;
  sessionToken?: string;
  cookies?: Record<string, string | undefined>;
}

/** Injects the user resolved from the session cookie by SessionAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserShape | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
