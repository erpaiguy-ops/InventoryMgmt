'use client';

import { useQuery } from '@tanstack/react-query';

import { reportsService } from '@/services/reports.service';

const REPORTS = 'reports';

export function useDashboardKpis() {
  return useQuery({
    queryKey: [REPORTS, 'dashboard'],
    queryFn: () => reportsService.dashboardKpis(),
  });
}

export function useMonthlyTrends() {
  return useQuery({ queryKey: [REPORTS, 'trends'], queryFn: () => reportsService.monthlyTrends() });
}

export function useTopItems() {
  return useQuery({ queryKey: [REPORTS, 'top-items'], queryFn: () => reportsService.topItems() });
}

export function useAuditLog() {
  return useQuery({ queryKey: [REPORTS, 'audit-log'], queryFn: () => reportsService.auditLog() });
}
