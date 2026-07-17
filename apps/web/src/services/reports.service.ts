import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export interface ReportQueryParams {
  from?: string;
  to?: string;
}

export interface InventoryReport {
  totalProducts: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  lowStockCount: number;
}

export interface SalesReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  byStatus: Record<string, number>;
}

export interface PurchaseReport {
  totalOrders: number;
  totalSpend: number;
  byStatus: Record<string, number>;
}

export interface ProfitReport {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPct: number;
}

export interface TopProduct {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface CategoryReportRow {
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface SupplierReportRow {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalSpend: number;
}

export interface DashboardStats {
  inventory: InventoryReport;
  pendingPurchaseOrders: number;
  openSalesOrders: number;
  salesLast30Days: { totalOrders: number; totalRevenue: number };
}

export type ExportReportType =
  'inventory' | 'sales' | 'purchase' | 'profit' | 'top-products' | 'categories' | 'suppliers';

export const reportsService = {
  getInventoryReport: () => apiClient.get<InventoryReport>('/reports/inventory'),
  getSalesReport: (params: ReportQueryParams = {}) =>
    apiClient.get<SalesReport>(`/reports/sales${toQueryString(params)}`),
  getPurchaseReport: (params: ReportQueryParams = {}) =>
    apiClient.get<PurchaseReport>(`/reports/purchase${toQueryString(params)}`),
  getProfitReport: (params: ReportQueryParams = {}) =>
    apiClient.get<ProfitReport>(`/reports/profit${toQueryString(params)}`),
  getTopProducts: (limit?: number, params: ReportQueryParams = {}) =>
    apiClient.get<TopProduct[]>(`/reports/top-products${toQueryString({ ...params, limit })}`),
  getCategoryReport: (params: ReportQueryParams = {}) =>
    apiClient.get<CategoryReportRow[]>(`/reports/categories${toQueryString(params)}`),
  getSupplierReport: () => apiClient.get<SupplierReportRow[]>('/reports/suppliers'),
  getDashboardStats: () => apiClient.get<DashboardStats>('/reports/dashboard'),
  exportReport: (type: ExportReportType, params: ReportQueryParams = {}) =>
    apiClient.post<{ filename: string; csv: string }>('/reports/export', {
      type,
      format: 'csv',
      ...params,
    }),
};

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
