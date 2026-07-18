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

import { BulkCreateProductsDto } from './dto/bulk-create-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.CREATE)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Post('bulk')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.CREATE)
  bulkCreate(@CurrentTenant() tenantId: string, @Body() dto: BulkCreateProductsDto) {
    return this.productsService.bulkCreate(tenantId, dto);
  }

  @Get()
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListProductsDto) {
    return this.productsService.findAll(tenantId, query);
  }

  @Get('categories')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  getCategories(@CurrentTenant() tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Get('low-stock')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  getLowStock(@CurrentTenant() tenantId: string) {
    return this.productsService.getLowStock(tenantId);
  }

  @Get('stock-value')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  getStockValue(@CurrentTenant() tenantId: string) {
    return this.productsService.getStockValue(tenantId);
  }

  @Get('sku/:sku')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  findBySku(@CurrentTenant() tenantId: string, @Param('sku') sku: string) {
    return this.productsService.findBySku(tenantId, sku);
  }

  @Get(':id')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(MODULES.PRODUCTS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id);
  }
}
