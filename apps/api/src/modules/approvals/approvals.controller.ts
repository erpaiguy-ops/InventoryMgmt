import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { ApprovalsService } from './approvals.service';

class ActDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

class CreateReasonCodeDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9_]+$/, { message: 'docType must be snake_case' })
  docType!: string;

  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9_]+$/, { message: 'code must be snake_case' })
  code!: string;

  @IsString()
  @MaxLength(120)
  label!: string;
}

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  /** Requests waiting on the caller's role at their current step. */
  @Get('inbox')
  @RequirePermission(MODULES.APPROVALS, ACTIONS.VIEW)
  inbox(@CurrentPrincipal() principal: Principal) {
    if (principal.type !== 'tenant') throw new ForbiddenException('Tenant users only');
    return this.approvalsService.inbox(principal);
  }

  @Get('history')
  @RequirePermission(MODULES.APPROVALS, ACTIONS.VIEW)
  history(@CurrentTenant() tenantId: string) {
    return this.approvalsService.list(tenantId);
  }

  @Get('reason-codes')
  @RequirePermission(MODULES.APPROVALS, ACTIONS.VIEW)
  reasonCodes(@CurrentTenant() tenantId: string, @Query('docType') docType?: string) {
    return this.approvalsService.listReasonCodes(tenantId, docType);
  }

  @Post('reason-codes')
  @RequirePermission(MODULES.APPROVALS, ACTIONS.MANAGE)
  createReasonCode(@CurrentTenant() tenantId: string, @Body() dto: CreateReasonCodeDto) {
    return this.approvalsService.createReasonCode(tenantId, dto);
  }

  /** Approve or reject the current step; rejection requires a comment. */
  @Post(':id/act')
  @RequirePermission(MODULES.APPROVALS, ACTIONS.UPDATE)
  act(@CurrentPrincipal() principal: Principal, @Param('id') id: string, @Body() dto: ActDto) {
    if (principal.type !== 'tenant') throw new ForbiddenException('Tenant users only');
    return this.approvalsService.act(principal, id, dto.decision, dto.comment);
  }
}
