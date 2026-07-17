import { buildSyntheticEmail, type Organization } from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { BootstrapTenantAdminDto } from './dto/bootstrap-tenant-admin.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

function toOrganization(row: {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as Organization['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** Atomic RPC: creates the org plus its 3 seeded roles and default `users` module permissions in one transaction. */
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const orgId = await this.supabaseService.callTransaction<string>(
      'create_organization_with_defaults',
      { org_name: dto.name, org_slug: dto.slug },
    );

    return this.findOne(orgId);
  }

  async findAll(): Promise<Organization[]> {
    const { data, error } = await this.supabaseService
      .getTable('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toOrganization);
  }

  async findOne(id: string): Promise<Organization> {
    const { data, error } = await this.supabaseService
      .getTable('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return toOrganization(data);
  }

  async setStatus(id: string, status: 'active' | 'suspended'): Promise<Organization> {
    const { data, error } = await this.supabaseService
      .getTable('organizations')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update organization');
    }

    return toOrganization(data);
  }

  /**
   * Creates a tenant's very first user, as its tenant_admin. This is the
   * one legitimate bootstrap gap in the tenant-user-creation model: a
   * brand-new org has no users yet, and ordinary tenant user creation
   * requires already being authenticated as a tenant user of that same
   * org — a platform owner is the only principal with standing to break
   * that circularity.
   */
  async bootstrapAdmin(
    orgId: string,
    dto: BootstrapTenantAdminDto,
  ): Promise<{ id: string; username: string }> {
    const org = await this.findOne(orgId);

    const { data: role, error: roleError } = await this.supabaseService
      .getTable('roles')
      .select('id')
      .eq('tenant_id', orgId)
      .eq('slug', 'tenant_admin')
      .maybeSingle();

    if (roleError || !role) {
      throw new NotFoundException(
        'This organization has no tenant_admin role — was it created before v2 role seeding existed?',
      );
    }

    const email = buildSyntheticEmail(org.slug, dto.username);

    const { data: authData, error: authError } = await this.supabaseService
      .getAuthAdmin()
      .createUser({
        email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          v2_principal_type: 'tenant',
          tenant_id: orgId,
          username: dto.username,
          role_id: role.id,
          full_name: dto.fullName,
        },
      });

    if (authError || !authData.user) {
      throw new ConflictException(authError?.message ?? 'Failed to create tenant admin');
    }

    return { id: authData.user.id, username: dto.username };
  }
}
