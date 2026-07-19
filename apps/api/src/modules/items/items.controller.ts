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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateBrandDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { BulkCreateItemsDto, CreateItemDto, ListItemsDto, UpdateItemDto } from './dto/item.dto';
import { CreatePriceListDto, SetPriceListItemsDto, UpdatePriceListDto } from './dto/price-list.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // Static routes before ':id' so Nest doesn't treat them as item ids.

  // --- categories ------------------------------------------------------------

  @Get('categories')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  listCategories(@CurrentTenant() tenantId: string) {
    return this.itemsService.listCategories(tenantId);
  }

  @Post('categories')
  @RequirePermission(MODULES.ITEMS, ACTIONS.CREATE)
  createCategory(@CurrentTenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.itemsService.createCategory(tenantId, dto);
  }

  @Put('categories/:id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.UPDATE)
  updateCategory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.itemsService.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.deleteCategory(tenantId, id);
  }

  // --- brands ----------------------------------------------------------------

  @Get('brands')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  listBrands(@CurrentTenant() tenantId: string) {
    return this.itemsService.listBrands(tenantId);
  }

  @Post('brands')
  @RequirePermission(MODULES.ITEMS, ACTIONS.CREATE)
  createBrand(@CurrentTenant() tenantId: string, @Body() dto: CreateBrandDto) {
    return this.itemsService.createBrand(tenantId, dto);
  }

  @Delete('brands/:id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBrand(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.deleteBrand(tenantId, id);
  }

  // --- price lists -----------------------------------------------------------

  @Get('price-lists')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  listPriceLists(@CurrentTenant() tenantId: string) {
    return this.itemsService.listPriceLists(tenantId);
  }

  @Post('price-lists')
  @RequirePermission(MODULES.ITEMS, ACTIONS.MANAGE)
  createPriceList(@CurrentTenant() tenantId: string, @Body() dto: CreatePriceListDto) {
    return this.itemsService.createPriceList(tenantId, dto);
  }

  @Put('price-lists/:id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.MANAGE)
  updatePriceList(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.itemsService.updatePriceList(tenantId, id, dto);
  }

  @Get('price-lists/:id/prices')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  listPriceListItems(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.listPriceListItems(tenantId, id);
  }

  @Put('price-lists/:id/prices')
  @RequirePermission(MODULES.ITEMS, ACTIONS.MANAGE)
  setPriceListItems(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetPriceListItemsDto,
  ) {
    return this.itemsService.setPriceListItems(tenantId, id, dto);
  }

  // --- items -----------------------------------------------------------------

  @Get()
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListItemsDto) {
    return this.itemsService.findAll(tenantId, query);
  }

  @Post()
  @RequirePermission(MODULES.ITEMS, ACTIONS.CREATE)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateItemDto) {
    return this.itemsService.create(tenantId, dto);
  }

  @Post('bulk')
  @RequirePermission(MODULES.ITEMS, ACTIONS.CREATE)
  bulkCreate(@CurrentTenant() tenantId: string, @Body() dto: BulkCreateItemsDto) {
    return this.itemsService.bulkCreate(tenantId, dto);
  }

  @Get(':id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.UPDATE)
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(MODULES.ITEMS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.itemsService.remove(tenantId, id);
  }
}
