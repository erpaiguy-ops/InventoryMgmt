import type { PaginationParams } from '@inventory-mgmt/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentOrganization() organizationId: string, @Query() query: PaginationParams) {
    return this.productsService.findAll(organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentOrganization() organizationId: string, @Param('id') id: string) {
    return this.productsService.findOne(organizationId, id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@CurrentOrganization() organizationId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(organizationId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentOrganization() organizationId: string, @Param('id') id: string) {
    return this.productsService.remove(organizationId, id);
  }
}
