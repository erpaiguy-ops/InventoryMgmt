import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import type { RequestProfile } from '../guards/supabase-auth.guard';

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { profile?: RequestProfile }>();

    if (!request.profile) {
      throw new UnauthorizedException('No organization context available');
    }

    return request.profile.organizationId;
  },
);
