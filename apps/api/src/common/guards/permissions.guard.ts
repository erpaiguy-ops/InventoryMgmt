import { hasPermission } from '@inventory-mgmt/shared-types';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  PERMISSION_KEY,
  type RequiredPermission,
} from '../decorators/require-permission.decorator';

import type { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Fail closed: a route behind PermissionsGuard that forgot
    // @RequirePermission is a bug, not an implicit "allow any authenticated
    // tenant user" — surface it loudly instead of silently granting access.
    if (!required) {
      throw new ForbiddenException(
        'This endpoint is missing a @RequirePermission decorator (fail-closed default)',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.principal;

    if (!principal || principal.type !== 'tenant') {
      throw new ForbiddenException('This endpoint requires a tenant user');
    }

    if (!hasPermission(principal.permissions, required.module, required.action)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
