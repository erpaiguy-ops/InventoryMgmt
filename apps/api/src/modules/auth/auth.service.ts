import type { Profile } from '@inventory-mgmt/shared-types';
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  async signIn(dto: LoginDto): Promise<AuthSessionResult> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email: dto.email, password: dto.password });

    if (error || !data.session) {
      this.logger.warn(`Login failed for ${dto.email}: ${error?.message}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: data.user,
    };
  }

  /** Admin-only: creates a user directly (with a password the admin sets). */
  async signUp(dto: RegisterDto): Promise<AuthSessionResult> {
    const admin = this.supabaseService.getClient();

    // The on_auth_user_created trigger creates the matching public.profiles
    // row (using user_metadata.full_name) as soon as this insert commits.
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { full_name: dto.fullName },
    });

    if (authError || !authData.user) {
      throw new UnauthorizedException(authError?.message ?? 'Registration failed');
    }

    if (dto.role) {
      const { error: roleError } = await admin
        .from('profiles')
        .update({ role: dto.role })
        .eq('id', authData.user.id);

      if (roleError) {
        this.logger.warn(
          `Failed to set role for new user ${authData.user.id}: ${roleError.message}`,
        );
      }
    }

    return this.signIn({ email: dto.email, password: dto.password });
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

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { error } = await this.supabaseService.getClient().auth.resetPasswordForEmail(dto.email);

    if (error) {
      this.logger.warn(`Password reset request failed for ${dto.email}: ${error.message}`);
    }
    // Always resolve successfully to avoid leaking which emails are registered.
  }

  /** Re-authenticates with the current password before applying the new one. */
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

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profile not found');
    }

    return this.toProfile(data);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update({ full_name: dto.fullName })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Profile not found');
    }

    return this.toProfile(data);
  }

  private toProfile(row: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
    updated_at: string;
  }): Profile {
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role as Profile['role'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
