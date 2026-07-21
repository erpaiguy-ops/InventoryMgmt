import type { Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentToken } from '../../common/decorators/current-token.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Tenant username/password login. No public self-registration — accounts are admin-created via UsersModule. Tightly throttled: this is the one endpoint an attacker gets unlimited unauthenticated attempts against. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentToken() token: string) {
    await this.authService.signOut(token);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /** No self-service email reset for tenant users — synthetic-email accounts have no real inbox. Admins reset via PUT /users/:id/reset-password. Platform owners keep self-service reset — see OwnerAuthController. */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user, dto);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateProfile(@CurrentPrincipal() principal: Principal, @Body() dto: UpdateProfileDto) {
    await this.authService.updateProfile(principal, dto);
  }

  /** Enriched with the already-resolved principal (from AuthGuard) — no extra query needed beyond what login already did. */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: User, @CurrentPrincipal() principal: Principal) {
    return {
      id: user.id,
      emailConfirmedAt: user.email_confirmed_at,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      principal,
    };
  }
}
