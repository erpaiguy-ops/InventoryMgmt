import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';

import { CurrentToken } from '../../common/decorators/current-token.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';

import { OwnerLoginDto } from './dto/owner-login.dto';
import { OwnerResetPasswordDto } from './dto/owner-reset-password.dto';
import { OwnerAuthService } from './owner-auth.service';

@ApiTags('owner')
@Controller('owner/auth')
export class OwnerAuthController {
  constructor(
    private readonly ownerAuthService: OwnerAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: OwnerLoginDto) {
    return this.ownerAuthService.signIn(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: OwnerResetPasswordDto) {
    await this.ownerAuthService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard, OwnerGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentToken() token: string) {
    await this.authService.signOut(token);
  }

  @Post('change-password')
  @UseGuards(AuthGuard, OwnerGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user, dto);
  }
}
