import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CloseCashDrawerSessionDto,
  CreatePosSaleDto,
  OpenCashDrawerSessionDto,
} from './dto/pos.dto';
import { PosService } from './pos.service';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  // --- cash drawer sessions ----------------------------------------------------

  @Get('sessions')
  @RequirePermission(MODULES.POS, ACTIONS.VIEW)
  listSessions(@CurrentTenant() tenantId: string) {
    return this.posService.listSessions(tenantId);
  }

  @Post('sessions')
  @RequirePermission(MODULES.POS, ACTIONS.CREATE)
  openSession(
    @CurrentTenant() tenantId: string,
    @Body() dto: OpenCashDrawerSessionDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.posService.openSession(tenantId, dto, principal.id);
  }

  @Post('sessions/:id/close')
  @RequirePermission(MODULES.POS, ACTIONS.UPDATE)
  closeSession(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CloseCashDrawerSessionDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.posService.closeSession(tenantId, id, dto, principal.id);
  }

  // --- sales ----------------------------------------------------------------

  @Get('sales')
  @RequirePermission(MODULES.POS, ACTIONS.VIEW)
  listSales(@CurrentTenant() tenantId: string, @Query('sessionId') sessionId?: string) {
    return this.posService.listSales(tenantId, sessionId);
  }

  @Post('sales')
  @RequirePermission(MODULES.POS, ACTIONS.CREATE)
  createSale(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePosSaleDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.posService.createSale(tenantId, dto, principal.id);
  }
}
