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

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermission(MODULES.SUPPLIERS, ACTIONS.CREATE)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Get()
  @RequirePermission(MODULES.SUPPLIERS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListSuppliersDto) {
    return this.suppliersService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermission(MODULES.SUPPLIERS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.SUPPLIERS, ACTIONS.UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(MODULES.SUPPLIERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.remove(tenantId, id);
  }
}
