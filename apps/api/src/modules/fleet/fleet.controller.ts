import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateVehicleDocumentDto,
  CreateVehicleDto,
  CreateVehicleExpenseDto,
  UpdateVehicleDto,
} from './dto/fleet.dto';
import { FleetService } from './fleet.service';

@ApiTags('fleet')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('vehicles')
  @RequirePermission(MODULES.FLEET, ACTIONS.VIEW)
  listVehicles(@CurrentTenant() tenantId: string) {
    return this.fleetService.listVehicles(tenantId);
  }

  @Post('vehicles')
  @RequirePermission(MODULES.FLEET, ACTIONS.CREATE)
  createVehicle(@CurrentTenant() tenantId: string, @Body() dto: CreateVehicleDto) {
    return this.fleetService.createVehicle(tenantId, dto);
  }

  @Put('vehicles/:id')
  @RequirePermission(MODULES.FLEET, ACTIONS.UPDATE)
  updateVehicle(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.fleetService.updateVehicle(tenantId, id, dto);
  }

  @Get('documents')
  @RequirePermission(MODULES.FLEET, ACTIONS.VIEW)
  listDocuments(@CurrentTenant() tenantId: string, @Query('vehicleId') vehicleId?: string) {
    return this.fleetService.listDocuments(tenantId, vehicleId);
  }

  @Post('documents')
  @RequirePermission(MODULES.FLEET, ACTIONS.CREATE)
  createDocument(@CurrentTenant() tenantId: string, @Body() dto: CreateVehicleDocumentDto) {
    return this.fleetService.createDocument(tenantId, dto);
  }

  @Get('expenses')
  @RequirePermission(MODULES.FLEET, ACTIONS.VIEW)
  listExpenses(@CurrentTenant() tenantId: string, @Query('vehicleId') vehicleId?: string) {
    return this.fleetService.listExpenses(tenantId, vehicleId);
  }

  @Post('expenses')
  @RequirePermission(MODULES.FLEET, ACTIONS.CREATE)
  createExpense(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateVehicleExpenseDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.fleetService.createExpense(tenantId, dto, principal.id);
  }
}
