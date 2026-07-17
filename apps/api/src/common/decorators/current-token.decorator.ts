import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedRequest } from '../guards/auth.guard';

/** The raw bearer token verified by AuthGuard — use when an endpoint needs to act on the session itself (e.g. logout). */
export const CurrentToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.token) {
      throw new UnauthorizedException('No session token available');
    }

    return request.token;
  },
);
