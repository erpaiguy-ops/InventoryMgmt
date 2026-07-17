import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard';

/** Gates platform-owner-only endpoints. Always paired with AuthGuard, which populates request.principal. */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.principal?.type !== 'owner') {
      throw new ForbiddenException('This endpoint requires a platform owner');
    }

    return true;
  }
}
