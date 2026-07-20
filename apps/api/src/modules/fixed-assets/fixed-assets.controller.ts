import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateAssetCategoryDto,
  CreateAssetDto,
  DisposeAssetDto,
  RunDepreciationDto,
} from './dto/fixed-assets.dto';
import { FixedAssetsService } from './fixed-assets.service';

@ApiTags('fixed-assets')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Get('categories')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.VIEW)
  listCategories(@CurrentTenant() tenantId: string) {
    return this.fixedAssetsService.listCategories(tenantId);
  }

  @Post('categories')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.MANAGE)
  createCategory(@CurrentTenant() tenantId: string, @Body() dto: CreateAssetCategoryDto) {
    return this.fixedAssetsService.createCategory(tenantId, dto);
  }

  @Get('assets')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.VIEW)
  listAssets(@CurrentTenant() tenantId: string) {
    return this.fixedAssetsService.listAssets(tenantId);
  }

  @Post('assets')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.MANAGE)
  createAsset(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAssetDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.fixedAssetsService.createAsset(tenantId, dto, principal.id);
  }

  @Get('assets/:id')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.VIEW)
  getAsset(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.fixedAssetsService.getAsset(tenantId, id);
  }

  @Post('assets/:id/dispose')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.MANAGE)
  disposeAsset(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: DisposeAssetDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.fixedAssetsService.disposeAsset(tenantId, id, dto, principal.id);
  }

  @Get('depreciation-runs')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.VIEW)
  listDepreciationRuns(@CurrentTenant() tenantId: string) {
    return this.fixedAssetsService.listDepreciationRuns(tenantId);
  }

  @Post('depreciation-runs')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.MANAGE)
  runDepreciation(
    @CurrentTenant() tenantId: string,
    @Body() dto: RunDepreciationDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.fixedAssetsService.runDepreciation(tenantId, dto, principal.id);
  }

  @Get('disposals')
  @RequirePermission(MODULES.FIXED_ASSETS, ACTIONS.VIEW)
  listDisposals(@CurrentTenant() tenantId: string) {
    return this.fixedAssetsService.listDisposals(tenantId);
  }
}
