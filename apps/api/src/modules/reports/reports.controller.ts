import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // The dashboard is everyone's landing page — items view is the lowest
  // common permission every seeded role carries. The financial figures
  // within the response are masked server-side for callers without
  // financials:view (see ReportsService.dashboardKpis).
  @Get('dashboard')
  @RequirePermission(MODULES.ITEMS, ACTIONS.VIEW)
  dashboardKpis(@CurrentTenant() tenantId: string, @CurrentPrincipal() principal: Principal) {
    return this.reportsService.dashboardKpis(tenantId, principal);
  }

  // Pure $ chart — same boundary as the Financials module itself.
  @Get('trends')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  monthlyTrends(@CurrentTenant() tenantId: string) {
    return this.reportsService.monthlyTrends(tenantId);
  }

  // Revenue by item — gated on sales:view, which every seeded role that
  // touches sales already carries (staff included).
  @Get('top-items')
  @RequirePermission(MODULES.SALES, ACTIONS.VIEW)
  topItems(@CurrentTenant() tenantId: string) {
    return this.reportsService.topItems(tenantId);
  }

  // The audit trail is sensitive — admin-only via settings manage.
  @Get('audit-log')
  @RequirePermission(MODULES.SETTINGS, ACTIONS.MANAGE)
  auditLog(@CurrentTenant() tenantId: string) {
    return this.reportsService.auditLog(tenantId);
  }
}
