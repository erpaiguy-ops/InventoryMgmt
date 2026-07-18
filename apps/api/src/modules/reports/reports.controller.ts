import { ACTIONS, MODULES } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { ExportReportDto } from './dto/export-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getInventoryReport(@CurrentTenant() tenantId: string) {
    return this.reportsService.getInventoryReport(tenantId);
  }

  @Get('sales')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getSalesReport(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesReport(tenantId, query);
  }

  @Get('purchase')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getPurchaseReport(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.getPurchaseReport(tenantId, query);
  }

  // Margin data is the most sensitive report — gate it behind 'manage'
  // (admin-only by default), mirroring v1's manager+ restriction in spirit.
  @Get('profit')
  @RequirePermission(MODULES.REPORTS, ACTIONS.MANAGE)
  getProfitReport(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.getProfitReport(tenantId, query);
  }

  @Get('top-products')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getTopProducts(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit: string | undefined,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getTopProducts(tenantId, limit ? Number(limit) : undefined, query);
  }

  @Get('categories')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getCategoryReport(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.getCategoryReport(tenantId, query);
  }

  @Get('suppliers')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getSupplierReport(@CurrentTenant() tenantId: string) {
    return this.reportsService.getSupplierReport(tenantId);
  }

  @Get('dashboard')
  @RequirePermission(MODULES.REPORTS, ACTIONS.VIEW)
  getDashboardStats(@CurrentTenant() tenantId: string) {
    return this.reportsService.getDashboardStats(tenantId);
  }

  @Post('export')
  @RequirePermission(MODULES.REPORTS, ACTIONS.MANAGE)
  exportReport(@CurrentTenant() tenantId: string, @Body() dto: ExportReportDto) {
    return this.reportsService.exportReport(tenantId, dto);
  }
}
