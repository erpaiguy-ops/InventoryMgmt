import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateGoodsReceiptDto,
  CreateLandedCostDto,
  CreatePurchaseBillDto,
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
} from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // --- purchase orders --------------------------------------------------------

  @Get('purchase-orders')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  listPos(@CurrentTenant() tenantId: string) {
    return this.procurementService.listPos(tenantId);
  }

  @Post('purchase-orders')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.CREATE)
  createPo(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.createPo(tenantId, dto, principal.id);
  }

  @Get('purchase-orders/:id')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  getPo(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.procurementService.getPo(tenantId, id);
  }

  @Post('purchase-orders/:id/submit')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.UPDATE)
  submitPo(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.submitPo(tenantId, id, principal.id);
  }

  @Post('purchase-orders/:id/cancel')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.UPDATE)
  cancelPo(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.procurementService.cancelPo(tenantId, id);
  }

  // --- goods receipts ---------------------------------------------------------

  @Get('goods-receipts')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  listGrns(@CurrentTenant() tenantId: string, @Query('poId') poId?: string) {
    return this.procurementService.listGrns(tenantId, poId);
  }

  @Post('goods-receipts')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.CREATE)
  receiveGoods(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.receiveGoods(tenantId, dto, principal.id);
  }

  // --- purchase bills ---------------------------------------------------------

  @Get('bills')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  listBills(@CurrentTenant() tenantId: string) {
    return this.procurementService.listBills(tenantId);
  }

  @Post('bills')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.CREATE)
  createBill(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePurchaseBillDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.createBill(tenantId, dto, principal.id);
  }

  // --- supplier returns -------------------------------------------------------

  @Get('returns')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  listReturns(@CurrentTenant() tenantId: string) {
    return this.procurementService.listReturns(tenantId);
  }

  @Post('returns')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.CREATE)
  createReturn(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePurchaseReturnDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.createReturn(tenantId, dto, principal.id);
  }

  // --- landed costs -----------------------------------------------------------

  @Get('landed-costs')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.VIEW)
  listLandedCosts(@CurrentTenant() tenantId: string) {
    return this.procurementService.listLandedCosts(tenantId);
  }

  @Post('landed-costs')
  @RequirePermission(MODULES.PROCUREMENT, ACTIONS.CREATE)
  addLandedCost(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLandedCostDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.procurementService.addLandedCost(tenantId, dto, principal.id);
  }
}
