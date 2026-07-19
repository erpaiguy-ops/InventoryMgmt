import type { Database } from '@inventory-mgmt/database';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import type { StorageBucket } from './supabase.constants';

type V2Schema = Database['v2'];
type TableName = keyof V2Schema['Tables'];

/** Tables whose Row type carries a tenant_id column — computed from the Database type so future v2 tables are picked up automatically. */
type TenantScopedTableName = {
  [K in TableName]: V2Schema['Tables'][K]['Row'] extends { tenant_id: string } ? K : never;
}[TableName];

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly adminClient: SupabaseClient<Database, 'v2'>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url', { infer: true }) ?? '';
    const serviceRoleKey =
      this.configService.get<string>('supabase.serviceRoleKey', { infer: true }) ?? '';

    this.adminClient = createClient<Database, 'v2'>(url, serviceRoleKey, {
      db: { schema: 'v2' },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Service-role client — bypasses RLS. Use only in trusted server-side code paths, and only for non-tenant-scoped tables (organizations, platform_owners) or genuinely cross-tenant reads (the owner module). Tenant-scoped access should go through selectTenant/insertTenant/updateTenant/deleteTenant instead. */
  getClient(): SupabaseClient<Database, 'v2'> {
    return this.adminClient;
  }

  /** Alias for getClient(), kept for readability at call sites that only need admin auth APIs. */
  getAuthAdmin(): SupabaseClient<Database, 'v2'>['auth']['admin'] {
    return this.adminClient.auth.admin;
  }

  /** Creates a client scoped to a specific user's access token, so RLS policies apply. Currently unused by any call site (same as v1) — kept as an escape hatch. */
  getClientForToken(accessToken: string): SupabaseClient<Database, 'v2'> {
    const url = this.configService.get<string>('supabase.url', { infer: true }) ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey', { infer: true }) ?? '';

    return createClient<Database, 'v2'>(url, anonKey, {
      db: { schema: 'v2' },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  async verifyToken(accessToken: string): Promise<User | null> {
    const { data, error } = await this.adminClient.auth.getUser(accessToken);

    if (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }

    return data.user;
  }

  /** Typed `.from(table)` helper so callers don't repeat `getClient().from(...)`. Only for non-tenant-scoped tables — see selectTenant/etc. for tenant-scoped ones. */
  getTable<T extends TableName>(tableName: T) {
    return this.adminClient.from(tableName);
  }

  /**
   * Purpose-built lookup for the one legitimate cross-reference tenant-facing
   * services need: resolving an org's slug (to build a synthetic login email)
   * from just its tenant_id. A named helper rather than a raw getTable/
   * getClient call so it isn't a loophole in the tenant-scoping guardrail —
   * organizations isn't tenant-scoped (it *is* the tenant), so this is safe.
   */
  async getOrganizationSlug(tenantId: string): Promise<string> {
    const { data, error } = await this.adminClient
      .from('organizations')
      .select('slug')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(error?.message ?? 'Organization not found');
    }

    return data.slug;
  }

  /** Purpose-built update for the platform owner's own display name — platform_owners isn't tenant-scoped, so it's exempt from selectTenant/etc. by design, not by omission. */
  async updateOwnerFullName(id: string, fullName: string | undefined): Promise<void> {
    const { error } = await this.adminClient
      .from('platform_owners')
      .update({ full_name: fullName })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Tenant-scoped select — tenant_id filtering can't be forgotten since it's
   * baked into the call. The client is used untyped internally (same
   * as callTransaction below): TypeScript can't resolve a filter builder's
   * column constraints against a still-generic table-name type parameter,
   * a known limitation, not a loosening of the safety callers actually get
   * — T is still constrained to TenantScopedTableName at the call site.
   */
  selectTenant<T extends TenantScopedTableName>(
    tenantId: string,
    table: T,
    columns = '*',
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean },
  ) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    return untypedClient.from(table).select(columns, options).eq('tenant_id', tenantId);
  }

  /**
   * Tenant-scoped insert — stamps tenant_id into the row automatically. The
   * payload itself is intentionally loosely typed at this generic-helper
   * layer (composing exact Insert types across a mapped table union isn't
   * worth the complexity); call sites should still construct payloads from
   * their own strongly-typed DTOs before calling this.
   */
  insertTenant<T extends TenantScopedTableName>(
    tenantId: string,
    table: T,
    row: Record<string, unknown> | Record<string, unknown>[],
  ) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    const stamped = Array.isArray(row)
      ? row.map((r) => ({ ...r, tenant_id: tenantId }))
      : { ...row, tenant_id: tenantId };
    return untypedClient.from(table).insert(stamped);
  }

  /** Tenant-scoped update — filters by tenant_id AND id, so a caller can never accidentally patch another tenant's row even by guessing an id. */
  updateTenant<T extends TenantScopedTableName>(
    tenantId: string,
    table: T,
    id: string,
    patch: Record<string, unknown>,
  ) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    return untypedClient.from(table).update(patch).eq('tenant_id', tenantId).eq('id', id);
  }

  /** Tenant-scoped delete — same double-filter guarantee as updateTenant. */
  deleteTenant<T extends TenantScopedTableName>(tenantId: string, table: T, id: string) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    return untypedClient.from(table).delete().eq('tenant_id', tenantId).eq('id', id);
  }

  /** Tenant-scoped delete by an arbitrary column (e.g. all item_barcodes for one item_id) — same tenant_id guarantee as deleteTenant, for child tables replaced as a set. */
  deleteTenantWhere<T extends TenantScopedTableName>(
    tenantId: string,
    table: T,
    column: string,
    value: string,
  ) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    return untypedClient.from(table).delete().eq('tenant_id', tenantId).eq(column, value);
  }

  /** For one-row-per-tenant tables keyed by tenant_id itself (e.g. org_settings): the tenant_id filter IS the row identity, so no id filter exists or is needed. */
  updateTenantSingleton<T extends TenantScopedTableName>(
    tenantId: string,
    table: T,
    patch: Record<string, unknown>,
  ) {
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    return untypedClient.from(table).update(patch).eq('tenant_id', tenantId);
  }

  async uploadFile(
    bucket: StorageBucket,
    path: string,
    file: Buffer | Blob,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ path: string }> {
    const { data, error } = await this.adminClient.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });

    if (error || !data) {
      throw new InternalServerErrorException(error?.message ?? 'Failed to upload file');
    }

    return data;
  }

  getPublicUrl(bucket: StorageBucket, path: string): string {
    return this.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async deleteFile(bucket: StorageBucket, paths: string[]): Promise<void> {
    const { error } = await this.adminClient.storage.from(bucket).remove(paths);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Calls a Postgres function (RPC) so a multi-step write executes atomically
   * in the database. Supabase's REST layer has no client-side transaction
   * primitive — genuine atomicity requires the logic to live in a Postgres
   * function, which this simply invokes.
   */
  async callTransaction<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    // Cast to the untyped client: functionName is intentionally a plain
    // string so callers aren't limited to the Database type's currently
    // known RPC functions.
    const untypedClient = this.adminClient as unknown as SupabaseClient;
    const { data, error } = (await untypedClient.rpc(functionName, params)) as {
      data: T;
      error: { message: string } | null;
    };

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }
}
