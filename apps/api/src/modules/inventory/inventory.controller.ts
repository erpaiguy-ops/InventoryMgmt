import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateAdjustmentDto,
  CreateAuditDto,
  CreateTransferDto,
  EnterAuditCountsDto,
  ReorderRuleDto,
  SubmitForApprovalDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('balances')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  balances(@CurrentTenant() tenantId: string, @Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.balances(tenantId, warehouseId);
  }

  @Get('ledger')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  ledger(
    @CurrentTenant() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.ledger(tenantId, { itemId, warehouseId });
  }

  @Get('batches')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  batches(@CurrentTenant() tenantId: string, @Query('itemId') itemId?: string) {
    return this.inventoryService.listBatches(tenantId, itemId);
  }

  // --- transfers -------------------------------------------------------------

  @Get('transfers')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  listTransfers(@CurrentTenant() tenantId: string) {
    return this.inventoryService.listTransfers(tenantId);
  }

  @Post('transfers')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.CREATE)
  createTransfer(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTransferDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.createTransfer(tenantId, dto, principal.id);
  }

  @Get('transfers/:id')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getTransfer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getTransfer(tenantId, id);
  }

  @Post('transfers/:id/dispatch')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  dispatchTransfer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.dispatchTransfer(tenantId, id);
  }

  @Post('transfers/:id/receive')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  receiveTransfer(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.receiveTransfer(tenantId, id);
  }

  // --- adjustments -----------------------------------------------------------

  @Get('adjustments')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  listAdjustments(@CurrentTenant() tenantId: string) {
    return this.inventoryService.listAdjustments(tenantId);
  }

  @Post('adjustments')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.CREATE)
  createAdjustment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAdjustmentDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.createAdjustment(tenantId, dto, principal.id);
  }

  @Get('adjustments/:id')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getAdjustment(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getAdjustment(tenantId, id);
  }

  @Post('adjustments/:id/submit')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  submitAdjustment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitForApprovalDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.submitAdjustment(tenantId, id, dto, principal.id);
  }

  // --- stock audits ----------------------------------------------------------

  @Get('audits')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  listAudits(@CurrentTenant() tenantId: string) {
    return this.inventoryService.listAudits(tenantId);
  }

  @Post('audits')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.CREATE)
  createAudit(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAuditDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.createAudit(tenantId, dto, principal.id);
  }

  @Get('audits/:id')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  getAudit(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getAudit(tenantId, id);
  }

  @Put('audits/:id/counts')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  enterCounts(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: EnterAuditCountsDto,
  ) {
    return this.inventoryService.enterAuditCounts(tenantId, id, dto);
  }

  @Post('audits/:id/submit')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  submitAudit(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitForApprovalDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.inventoryService.submitAudit(tenantId, id, dto, principal.id);
  }

  // --- reorder ---------------------------------------------------------------

  @Get('reorder-rules')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  listReorderRules(@CurrentTenant() tenantId: string) {
    return this.inventoryService.listReorderRules(tenantId);
  }

  @Put('reorder-rules')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.UPDATE)
  upsertReorderRule(@CurrentTenant() tenantId: string, @Body() dto: ReorderRuleDto) {
    return this.inventoryService.upsertReorderRule(tenantId, dto);
  }

  @Get('reorder-suggestions')
  @RequirePermission(MODULES.INVENTORY, ACTIONS.VIEW)
  reorderSuggestions(@CurrentTenant() tenantId: string) {
    return this.inventoryService.reorderSuggestions(tenantId);
  }
}
