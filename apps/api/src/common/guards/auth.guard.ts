import type {
  ModuleName,
  OwnerPrincipal,
  PermissionAction,
  Principal,
} from '@inventory-mgmt/shared-types';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { Request } from 'express';

import { SupabaseService } from '../supabase/supabase.service';

export interface AuthenticatedRequest extends Request {
  user?: User;
  principal?: Principal;
  token?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.supabaseService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const principal = await this.resolvePrincipal(user);

    if (!principal) {
      throw new UnauthorizedException(
        'No platform owner or tenant profile associated with this account',
      );
    }

    request.user = user;
    request.principal = principal;
    request.token = token;
    return true;
  }

  /**
   * Owner-check and tenant-profile-check run in parallel (not sequentially)
   * so added latency is max(), not sum(), of the two lookups. A user is
   * exactly one of the two principal types — platform_owners and v2.profiles
   * are disjoint by construction (see the v2_principal_type-gated triggers
   * in the v2 foundation migration).
   */
  private async resolvePrincipal(user: User): Promise<Principal | null> {
    const client = this.supabaseService.getClient();

    const [ownerResult, tenantResult] = await Promise.all([
      client.from('platform_owners').select('id, email, full_name').eq('id', user.id).maybeSingle(),
      client
        .from('profile_with_permissions')
        .select('id, tenant_id, username, full_name, role_id, role_slug, role_name, permissions')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (ownerResult.data) {
      const owner: OwnerPrincipal = {
        type: 'owner',
        id: ownerResult.data.id,
        email: ownerResult.data.email,
        fullName: ownerResult.data.full_name,
      };
      return owner;
    }

    if (tenantResult.data) {
      const row = tenantResult.data;
      return {
        type: 'tenant',
        id: row.id,
        tenantId: row.tenant_id,
        username: row.username,
        fullName: row.full_name,
        roleId: row.role_id,
        roleSlug: row.role_slug,
        roleName: row.role_name,
        permissions: row.permissions as Partial<Record<ModuleName, PermissionAction[]>>,
      };
    }

    return null;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return null;
    }

    return header.slice('Bearer '.length).trim();
  }
}
