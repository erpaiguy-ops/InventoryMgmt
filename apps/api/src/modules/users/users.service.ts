import { buildSyntheticEmail } from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export interface TenantRole {
  id: string;
  slug: string;
  name: string;
}

export interface TenantUser {
  id: string;
  username: string;
  fullName: string | null;
  roleId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function toTenantUser(row: {
  id: string;
  username: string;
  full_name: string | null;
  role_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}): TenantUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    roleId: row.role_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** The tenant's assignable roles — populates role pickers in the create-user/update-role UI. */
  async listRoles(tenantId: string): Promise<TenantRole[]> {
    const { data, error } = await this.supabaseService
      .selectTenant(tenantId, 'roles', 'id, slug, name')
      .order('name');

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []) as unknown as TenantRole[];
  }

  async findAll(tenantId: string): Promise<TenantUser[]> {
    const { data, error } = await this.supabaseService
      .selectTenant(tenantId, 'profiles')
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return ((data ?? []) as unknown as Parameters<typeof toTenantUser>[0][]).map(toTenantUser);
  }

  async findOne(tenantId: string, id: string): Promise<TenantUser> {
    const { data, error } = await this.supabaseService
      .selectTenant(tenantId, 'profiles')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return toTenantUser(data as unknown as Parameters<typeof toTenantUser>[0]);
  }

  /** Validates roleId belongs to the caller's own tenant before any assignment — closes the cross-tenant/privilege-escalation gap the old inviteUser endpoint had. */
  private async assertRoleBelongsToTenant(tenantId: string, roleId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .selectTenant(tenantId, 'roles')
      .eq('id', roleId)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException('roleId does not belong to this organization');
    }
  }

  /** Sole tenant-user creation path: admin sets a password directly and communicates it out-of-band — synthetic-email accounts have no inbox for an invite link. */
  async createUser(tenantId: string, dto: CreateUserDto): Promise<TenantUser> {
    await this.assertRoleBelongsToTenant(tenantId, dto.roleId);

    const orgSlug = await this.supabaseService.getOrganizationSlug(tenantId);
    const email = buildSyntheticEmail(orgSlug, dto.username);

    const { data: authData, error: authError } = await this.supabaseService
      .getAuthAdmin()
      .createUser({
        email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          v2_principal_type: 'tenant',
          tenant_id: tenantId,
          username: dto.username,
          role_id: dto.roleId,
          full_name: dto.fullName,
        },
      });

    if (authError || !authData.user) {
      throw new ConflictException(authError?.message ?? 'Failed to create user');
    }

    // v2.handle_new_auth_user trigger creates the matching v2.profiles row synchronously on insert.
    return this.findOne(tenantId, authData.user.id);
  }

  async updateRole(tenantId: string, id: string, dto: UpdateRoleDto): Promise<TenantUser> {
    await this.assertRoleBelongsToTenant(tenantId, dto.roleId);

    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'profiles', id, { role_id: dto.roleId })
      .select()
      .maybeSingle()) as {
      data: Parameters<typeof toTenantUser>[0] | null;
      error: { message: string } | null;
    };

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update role');
    }

    return toTenantUser(data);
  }

  /** Admin-driven password reset — the only reset path for synthetic-email tenant accounts. */
  async resetPassword(tenantId: string, id: string, dto: ResetUserPasswordDto): Promise<void> {
    // Confirms the target user actually belongs to the caller's tenant before touching auth.users.
    await this.findOne(tenantId, id);

    const { error } = await this.supabaseService.getAuthAdmin().updateUserById(id, {
      password: dto.newPassword,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteUser(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    const { error } = await this.supabaseService.getAuthAdmin().deleteUser(id);

    if (error) {
      throw new NotFoundException(error.message);
    }
  }
}
