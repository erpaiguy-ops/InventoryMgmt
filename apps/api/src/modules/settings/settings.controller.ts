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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateNumberingSeriesDto, UpdateNumberingSeriesDto } from './dto/numbering-series.dto';
import { UpdateOrgSettingsDto } from './dto/org-settings.dto';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';
import { CreateUomDto, UpdateUomDto } from './dto/uom.dto';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { SettingsService } from './settings.service';

/**
 * Tenant backbone CRUD. Reads need settings:view (managers and staff have it —
 * item/partner forms populate their pickers from here); writes need
 * settings:manage (tenant admins only by default).
 */
@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // --- taxes -----------------------------------------------------------------

  @Get('taxes')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.VIEW)
  listTaxes(@CurrentTenant() tenantId: string) {
    return this.settingsService.listTaxes(tenantId);
  }

  @Post('taxes')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  createTax(@CurrentTenant() tenantId: string, @Body() dto: CreateTaxDto) {
    return this.settingsService.createTax(tenantId, dto);
  }

  @Put('taxes/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  updateTax(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.settingsService.updateTax(tenantId, id, dto);
  }

  @Delete('taxes/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTax(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.settingsService.deleteTax(tenantId, id);
  }

  // --- uoms ------------------------------------------------------------------

  @Get('uoms')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.VIEW)
  listUoms(@CurrentTenant() tenantId: string) {
    return this.settingsService.listUoms(tenantId);
  }

  @Post('uoms')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  createUom(@CurrentTenant() tenantId: string, @Body() dto: CreateUomDto) {
    return this.settingsService.createUom(tenantId, dto);
  }

  @Put('uoms/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  updateUom(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateUomDto) {
    return this.settingsService.updateUom(tenantId, id, dto);
  }

  @Delete('uoms/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUom(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.settingsService.deleteUom(tenantId, id);
  }

  // --- warehouses ------------------------------------------------------------

  @Get('warehouses')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.VIEW)
  listWarehouses(@CurrentTenant() tenantId: string) {
    return this.settingsService.listWarehouses(tenantId);
  }

  @Post('warehouses')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  createWarehouse(@CurrentTenant() tenantId: string, @Body() dto: CreateWarehouseDto) {
    return this.settingsService.createWarehouse(tenantId, dto);
  }

  @Put('warehouses/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  updateWarehouse(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.settingsService.updateWarehouse(tenantId, id, dto);
  }

  @Delete('warehouses/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWarehouse(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.settingsService.deleteWarehouse(tenantId, id);
  }

  // --- numbering series ------------------------------------------------------

  @Get('numbering-series')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.VIEW)
  listNumberingSeries(@CurrentTenant() tenantId: string) {
    return this.settingsService.listNumberingSeries(tenantId);
  }

  @Post('numbering-series')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  createNumberingSeries(@CurrentTenant() tenantId: string, @Body() dto: CreateNumberingSeriesDto) {
    return this.settingsService.createNumberingSeries(tenantId, dto);
  }

  @Put('numbering-series/:id')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  updateNumberingSeries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNumberingSeriesDto,
  ) {
    return this.settingsService.updateNumberingSeries(tenantId, id, dto);
  }

  // --- org settings ----------------------------------------------------------

  @Get('org')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.VIEW)
  getOrgSettings(@CurrentTenant() tenantId: string) {
    return this.settingsService.getOrgSettings(tenantId);
  }

  @Put('org')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  updateOrgSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateOrgSettingsDto) {
    return this.settingsService.updateOrgSettings(tenantId, dto);
  }
}
