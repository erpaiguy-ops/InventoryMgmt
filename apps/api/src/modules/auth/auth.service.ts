import { buildSyntheticEmail, type Principal } from '@inventory-mgmt/shared-types';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | undefined;
  user: User;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Tenant username/password login — resolves the synthetic email deterministically, no pre-lookup query. */
  async signIn(dto: LoginDto): Promise<AuthSessionResult> {
    const email = buildSyntheticEmail(dto.orgSlug, dto.username);
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email, password: dto.password });

    if (error || !data.session) {
      this.logger.warn(`Login failed for ${dto.orgSlug}/${dto.username}: ${error?.message}`);
      throw new UnauthorizedException('Invalid organization, username, or password');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: data.user,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSessionResult> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: data.session.user,
    };
  }

  async signOut(accessToken: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.signOut(accessToken, 'local');

    if (error) {
      this.logger.warn(`Sign-out failed: ${error.message}`);
    }
  }

  /** Re-authenticates with the current password before applying the new one. Works for both principal types — both have a real entry in auth.users, synthetic or not. */
  async changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    if (!user.email) {
      throw new UnauthorizedException('Account has no email on file');
    }

    const { error: verifyError } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email: user.email, password: dto.currentPassword });

    if (verifyError) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(user.id, { password: dto.newPassword });

    if (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  /** Updates the caller's own display name — dispatches by principal type since owners and tenant users live in different tables, each with its own purpose-built SupabaseService helper. */
  async updateProfile(principal: Principal, dto: UpdateProfileDto): Promise<void> {
    if (principal.type === 'owner') {
      await this.supabaseService.updateOwnerFullName(principal.id, dto.fullName);
      return;
    }

    const { error } = await this.supabaseService
      .updateTenant(principal.tenantId, 'profiles', principal.id, { full_name: dto.fullName })
      .select();

    if (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
