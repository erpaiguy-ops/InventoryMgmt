/**
 * v2 Phase 8 shared types — Reports & Dashboards (M10) + Audit (M13).
 */

export interface DashboardKpis {
  salesMtd: number;
  purchasesMtd: number;
  stockValue: number;
  openAr: number;
  openAp: number;
  pendingApprovals: number;
  activeEmployees: number;
  activeVehicles: number;
  expiringVehicleDocs: number;
}

export interface MonthlyTrend {
  month: string;
  sales: number;
  purchases: number;
}

export interface TopItem {
  itemId: string;
  sku: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  method: string;
  path: string;
  module: string | null;
  summary: string | null;
  createdAt: string;
}
