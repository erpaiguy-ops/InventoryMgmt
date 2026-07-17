import { ACTIONS, MODULES } from '@inventory-mgmt/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission(MODULES.USERS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  // Declared before :id so Nest doesn't try to route "roles" as an :id param.
  @Get('roles')
  @RequirePermission(MODULES.USERS, ACTIONS.VIEW)
  listRoles(@CurrentTenant() tenantId: string) {
    return this.usersService.listRoles(tenantId);
  }

  @Post()
  @RequirePermission(MODULES.USERS, ACTIONS.CREATE)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(tenantId, dto);
  }

  @Get(':id')
  @RequirePermission(MODULES.USERS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Put(':id/role')
  @RequirePermission(MODULES.USERS, ACTIONS.MANAGE)
  updateRole(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(tenantId, id, dto);
  }

  @Put(':id/reset-password')
  @RequirePermission(MODULES.USERS, ACTIONS.MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
  ) {
    return this.usersService.resetPassword(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(MODULES.USERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.deleteUser(tenantId, id);
  }
}
