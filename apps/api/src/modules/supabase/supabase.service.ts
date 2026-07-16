import type { Database } from '@inventory-mgmt/database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

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
  getAdminClient(): SupabaseClient<Database> {
    return this.adminClient;
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
}
