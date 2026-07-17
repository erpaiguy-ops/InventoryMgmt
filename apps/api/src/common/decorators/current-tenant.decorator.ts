import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedRequest } from '../guards/auth.guard';

/** Extracts the caller's tenantId. Throws if the caller isn't a tenant principal (e.g. an owner-only route used by mistake). */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.principal?.type !== 'tenant') {
      throw new ForbiddenException('This endpoint requires a tenant user');
    }

    return request.principal.tenantId;
  },
);
