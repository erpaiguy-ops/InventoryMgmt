import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProductsService } from '../products/products.service';

import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkUpdateStockDto } from './dto/bulk-update-stock.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ValidateStockDto } from './dto/validate-stock.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getAllInventory(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getAllInventory(tenantId);
  }

  // Static routes must be declared before the dynamic ':productId' route
  // below, or Nest would match them as a productId value.
  @Get('low-stock')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getLowStockItems(@CurrentTenant() tenantId: string, @Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockItems(
      tenantId,
      threshold ? Number(threshold) : undefined,
    );
  }

  @Get('stock-value')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getStockValue(@CurrentTenant() tenantId: string) {
    return this.productsService.getStockValue(tenantId);
  }

  @Get('movements/:productId')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getMovements(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
    @Query() query: ListMovementsDto,
  ) {
    return this.inventoryService.getMovements(tenantId, productId, query);
  }

  @Post('adjust')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  adjustStock(
    @CurrentTenant() tenantId: string,
    @Body() dto: AdjustStockDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.adjustStock(tenantId, dto, principal.id);
  }

  @Post('bulk')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  bulkUpdateStock(
    @CurrentTenant() tenantId: string,
    @Body() dto: BulkUpdateStockDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.bulkUpdateStock(tenantId, dto, principal.id);
  }

  @Post('validate')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  validateStock(@CurrentTenant() tenantId: string, @Body() dto: ValidateStockDto) {
    return this.inventoryService.validateStock(tenantId, dto);
  }

  @Get(':productId')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getInventory(@CurrentTenant() tenantId: string, @Param('productId') productId: string) {
    return this.inventoryService.getInventory(tenantId, productId);
  }

  @Put(':productId')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  updateStock(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateStockDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.updateStock(
      tenantId,
      productId,
      dto.quantityChange,
      dto.movementType,
      {
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        notes: dto.notes,
        createdBy: principal.id,
      },
    );
  }
}
