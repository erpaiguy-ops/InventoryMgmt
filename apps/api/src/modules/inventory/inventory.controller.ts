import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductsService } from '../products/products.service';

import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkUpdateStockDto } from './dto/bulk-update-stock.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ValidateStockDto } from './dto/validate-stock.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  getAllInventory() {
    return this.inventoryService.getAllInventory();
  }

  // Static routes must be declared before the dynamic ':productId' route
  // below, or Nest would match them as a productId value.
  @Get('low-stock')
  getLowStockItems(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockItems(threshold ? Number(threshold) : undefined);
  }

  @Get('stock-value')
  getStockValue() {
    return this.productsService.getStockValue();
  }

  @Get('movements/:productId')
  getMovements(@Param('productId') productId: string, @Query() query: ListMovementsDto) {
    return this.inventoryService.getMovements(productId, query);
  }

  @Post('adjust')
  @Roles('super_admin', 'admin', 'manager')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: User) {
    return this.inventoryService.adjustStock(dto, user.id);
  }

  @Post('bulk')
  @Roles('super_admin', 'admin', 'manager')
  bulkUpdateStock(@Body() dto: BulkUpdateStockDto, @CurrentUser() user: User) {
    return this.inventoryService.bulkUpdateStock(dto, user.id);
  }

  @Post('validate')
  validateStock(@Body() dto: ValidateStockDto) {
    return this.inventoryService.validateStock(dto);
  }

  @Get(':productId')
  getInventory(@Param('productId') productId: string) {
    return this.inventoryService.getInventory(productId);
  }

  @Put(':productId')
  @Roles('super_admin', 'admin', 'manager')
  updateStock(
    @Param('productId') productId: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.updateStock(productId, dto.quantityChange, dto.movementType, {
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      notes: dto.notes,
      createdBy: user.id,
    });
  }
}
