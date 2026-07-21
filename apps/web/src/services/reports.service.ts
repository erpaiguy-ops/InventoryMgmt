import type {
  AuditLogEntry,
  DashboardKpis,
  MonthlyTrend,
  TopItem,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export const reportsService = {
  dashboardKpis: () => apiClient.get<DashboardKpis>('/reports/dashboard'),
  monthlyTrends: () => apiClient.get<MonthlyTrend[]>('/reports/trends'),
  topItems: () => apiClient.get<TopItem[]>('/reports/top-items'),
  auditLog: () => apiClient.get<AuditLogEntry[]>('/reports/audit-log'),
};
