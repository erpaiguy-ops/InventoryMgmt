import {
  ACTIONS,
  MODULES,
  hasPermission,
  type AuditLogEntry,
  type DashboardKpis,
  type MonthlyTrend,
  type Principal,
  type TopItem,
} from '@inventory-mgmt/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

type QueryError = { message: string } | null;

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  method: string;
  path: string;
  module: string | null;
  summary: string | null;
  created_at: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * The dashboard is everyone's landing page (gated only on items:view), but
   * the financial figures within it are not — a staff principal without
   * financials:view gets those fields masked to null server-side, matching
   * the "financials hidden from staff by default" boundary the Financials
   * module itself enforces.
   */
  async dashboardKpis(tenantId: string, principal: Principal): Promise<DashboardKpis> {
    const raw = await this.supabaseService.callTransaction<Record<string, number>>(
      'report_dashboard_kpis',
      { p_tenant_id: tenantId },
    );
    const canSeeFinancials =
      principal.type === 'tenant' &&
      hasPermission(principal.permissions, MODULES.FINANCIALS, ACTIONS.VIEW);

    return {
      salesMtd: canSeeFinancials ? Number(raw?.salesMtd ?? 0) : null,
      purchasesMtd: canSeeFinancials ? Number(raw?.purchasesMtd ?? 0) : null,
      stockValue: canSeeFinancials ? Number(raw?.stockValue ?? 0) : null,
      openAr: canSeeFinancials ? Number(raw?.openAr ?? 0) : null,
      openAp: canSeeFinancials ? Number(raw?.openAp ?? 0) : null,
      pendingApprovals: Number(raw?.pendingApprovals ?? 0),
      activeEmployees: Number(raw?.activeEmployees ?? 0),
      activeVehicles: Number(raw?.activeVehicles ?? 0),
      expiringVehicleDocs: Number(raw?.expiringVehicleDocs ?? 0),
    };
  }

  async monthlyTrends(tenantId: string): Promise<MonthlyTrend[]> {
    const rows = await this.supabaseService.callTransaction<
      { month: string; sales: number; purchases: number }[]
    >('report_monthly_trends', { p_tenant_id: tenantId });
    return (rows ?? []).map((r) => ({
      month: r.month,
      sales: Number(r.sales),
      purchases: Number(r.purchases),
    }));
  }

  async topItems(tenantId: string): Promise<TopItem[]> {
    const rows = await this.supabaseService.callTransaction<
      { item_id: string; sku: string; name: string; qty: number; revenue: number }[]
    >('report_top_items', { p_tenant_id: tenantId, p_limit: 5 });
    return (rows ?? []).map((r) => ({
      itemId: r.item_id,
      sku: r.sku,
      name: r.name,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    }));
  }

  async auditLog(tenantId: string): Promise<AuditLogEntry[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'audit_log')
      .order('created_at', { ascending: false })
      .limit(300)) as unknown as { data: AuditRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      method: r.method,
      path: r.path,
      module: r.module,
      summary: r.summary,
      createdAt: r.created_at,
    }));
  }
}
