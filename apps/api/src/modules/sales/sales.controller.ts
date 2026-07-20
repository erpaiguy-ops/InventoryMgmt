import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateDeliveryDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
} from './dto/sales.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // --- sales orders -----------------------------------------------------------

  @Get('orders')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  listSos(@CurrentTenant() tenantId: string) {
    return this.salesService.listSos(tenantId);
  }

  @Post('orders')
  @RequirePermission(MODULES.SALES, ACTIONS.CREATE)
  createSo(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesService.createSo(tenantId, dto, principal.id);
  }

  @Get('orders/:id')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  getSo(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.getSo(tenantId, id);
  }

  @Post('orders/:id/submit')
  @RequirePermission(MODULES.SALES, ACTIONS.UPDATE)
  submitSo(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesService.submitSo(tenantId, id, principal.id);
  }

  @Post('orders/:id/cancel')
  @RequirePermission(MODULES.SALES, ACTIONS.UPDATE)
  cancelSo(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.cancelSo(tenantId, id);
  }

  // --- deliveries -------------------------------------------------------------

  @Get('deliveries')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  listDeliveries(@CurrentTenant() tenantId: string, @Query('soId') soId?: string) {
    return this.salesService.listDeliveries(tenantId, soId);
  }

  @Post('deliveries')
  @RequirePermission(MODULES.SALES, ACTIONS.CREATE)
  deliverGoods(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDeliveryDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesService.deliverGoods(tenantId, dto, principal.id);
  }

  // --- invoices ---------------------------------------------------------------

  @Get('invoices')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  listInvoices(@CurrentTenant() tenantId: string) {
    return this.salesService.listInvoices(tenantId);
  }

  @Post('invoices')
  @RequirePermission(MODULES.SALES, ACTIONS.CREATE)
  createInvoice(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSalesInvoiceDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesService.createInvoice(tenantId, dto, principal.id);
  }

  // --- customer returns -------------------------------------------------------

  @Get('returns')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  listReturns(@CurrentTenant() tenantId: string) {
    return this.salesService.listReturns(tenantId);
  }

  @Post('returns')
  @RequirePermission(MODULES.SALES, ACTIONS.CREATE)
  createReturn(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSalesReturnDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesService.createReturn(tenantId, dto, principal.id);
  }
}
