import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';
import type { AuthSessionResult } from '../auth/auth.service';

import { OwnerLoginDto } from './dto/owner-login.dto';
import { OwnerResetPasswordDto } from './dto/owner-reset-password.dto';

@Injectable()
export class OwnerAuthService {
  private readonly logger = new Logger(OwnerAuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Real email, unlike tenant login — no synthetic-email construction needed. */
  async signIn(dto: OwnerLoginDto): Promise<AuthSessionResult> {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({ email: dto.email, password: dto.password });

    if (error || !data.session) {
      this.logger.warn(`Owner login failed for ${dto.email}: ${error?.message}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: data.user,
    };
  }

  /** Real inbox, so self-service reset-via-email is appropriate here — unlike synthetic-email tenant accounts. */
  async resetPassword(dto: OwnerResetPasswordDto): Promise<void> {
    const { error } = await this.supabaseService.getClient().auth.resetPasswordForEmail(dto.email);

    if (error) {
      this.logger.warn(`Owner password reset request failed for ${dto.email}: ${error.message}`);
    }
    // Always resolve successfully to avoid leaking which emails are registered.
  }
}
