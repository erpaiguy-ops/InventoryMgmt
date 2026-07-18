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

import { CreateSalesOrderDto } from './dto/create-so.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-so-status.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.CREATE)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSalesOrderDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.salesOrdersService.create(tenantId, dto, principal.id);
  }

  @Get()
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListSalesOrdersDto) {
    return this.salesOrdersService.findAll(tenantId, query);
  }

  @Get('report')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.VIEW)
  generateReport(@CurrentTenant() tenantId: string, @Query() query: ListSalesOrdersDto) {
    return this.salesOrdersService.generateReport(tenantId, query);
  }

  @Get('stats')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.VIEW)
  getStats(@CurrentTenant() tenantId: string) {
    return this.salesOrdersService.getStats(tenantId);
  }

  @Get('customer/:email')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.VIEW)
  getCustomerOrders(@CurrentTenant() tenantId: string, @Param('email') email: string) {
    return this.salesOrdersService.getCustomerOrders(tenantId, email);
  }

  @Get(':id')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(tenantId, id, dto);
  }

  @Put(':id/status')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
  ) {
    return this.salesOrdersService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/confirm')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  confirm(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.confirmOrder(tenantId, id);
  }

  @Post(':id/ship')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  ship(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.shipOrder(tenantId, id);
  }

  @Post(':id/deliver')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  deliver(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.deliverOrder(tenantId, id);
  }

  @Post(':id/cancel')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.UPDATE)
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.cancelOrder(tenantId, id);
  }

  @Delete(':id')
  @RequirePermission(MODULES.SALES_ORDERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDraft(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.deleteDraft(tenantId, id);
  }
}
