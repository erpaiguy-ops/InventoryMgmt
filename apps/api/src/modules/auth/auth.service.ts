import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async login(dto: LoginDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
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

  async register(dto: RegisterDto) {
    const admin = this.supabaseService.getAdminClient();

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

    return this.login({ email: dto.email, password: dto.password });
  }
}
