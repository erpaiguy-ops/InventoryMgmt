import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-po.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-po-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.purchaseOrdersService.create(tenantId, dto, principal.id);
  }

  @Get()
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListPurchaseOrdersDto) {
    return this.purchaseOrdersService.findAll(tenantId, query);
  }

  @Get('report')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.VIEW)
  generateReport(@CurrentTenant() tenantId: string, @Query() query: ListPurchaseOrdersDto) {
    return this.purchaseOrdersService.generateReport(tenantId, query);
  }

  @Get('stats')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.VIEW)
  getStats(@CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.getStats(tenantId);
  }

  @Get('supplier/:supplierId')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.VIEW)
  getSupplierOrders(@CurrentTenant() tenantId: string, @Param('supplierId') supplierId: string) {
    return this.purchaseOrdersService.getSupplierOrders(tenantId, supplierId);
  }

  @Get(':id')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(tenantId, id, dto);
  }

  @Put(':id/status')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.UPDATE)
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
  ) {
    return this.purchaseOrdersService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/receive')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.UPDATE)
  receive(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.purchaseOrdersService.receive(tenantId, id, dto, principal.id);
  }

  @Delete(':id')
  @RequirePermission(MODULES.PURCHASE_ORDERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDraft(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.deleteDraft(tenantId, id);
  }
}
