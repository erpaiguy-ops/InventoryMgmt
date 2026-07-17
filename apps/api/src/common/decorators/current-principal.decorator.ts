import type { Principal } from '@inventory-mgmt/shared-types';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedRequest } from '../guards/auth.guard';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.principal) {
      throw new UnauthorizedException('No principal resolved for this request');
    }

    return request.principal;
  },
);
