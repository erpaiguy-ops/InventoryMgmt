import type { Database } from '@inventory-mgmt/database';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import type { StorageBucket } from './supabase.constants';

type TableName = keyof Database['public']['Tables'];

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly adminClient: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url', { infer: true }) ?? '';
    const serviceRoleKey =
      this.configService.get<string>('supabase.serviceRoleKey', { infer: true }) ?? '';

    this.adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Service-role client — bypasses RLS. Use only in trusted server-side code paths. */
  getClient(): SupabaseClient<Database> {
    return this.adminClient;
  }

  /** Alias for getClient(), kept for readability at call sites that only need admin auth APIs. */
  getAuthAdmin(): SupabaseClient<Database>['auth']['admin'] {
    return this.adminClient.auth.admin;
  }

  /** Creates a client scoped to a specific user's access token, so RLS policies apply. */
  getClientForToken(accessToken: string): SupabaseClient<Database> {
    const url = this.configService.get<string>('supabase.url', { infer: true }) ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey', { infer: true }) ?? '';

    return createClient<Database>(url, anonKey, {
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

  /** Typed `.from(table)` helper so callers don't repeat `getClient().from(...)`. */
  getTable<T extends TableName>(tableName: T) {
    return this.adminClient.from(tableName);
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
