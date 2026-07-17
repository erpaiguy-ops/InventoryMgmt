'use client';

import { useQuery } from '@tanstack/react-query';

import type { ReportQueryParams } from '@/services/reports.service';
import { reportsService } from '@/services/reports.service';

const REPORTS_KEY = 'reports';

export function useDashboardStats() {
  return useQuery({
    queryKey: [REPORTS_KEY, 'dashboard'],
    queryFn: () => reportsService.getDashboardStats(),
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: [REPORTS_KEY, 'inventory'],
    queryFn: () => reportsService.getInventoryReport(),
  });
}

export function useSalesReport(params: ReportQueryParams = {}) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'sales', params],
    queryFn: () => reportsService.getSalesReport(params),
  });
}

export function usePurchaseReport(params: ReportQueryParams = {}) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'purchase', params],
    queryFn: () => reportsService.getPurchaseReport(params),
  });
}

export function useProfitReport(params: ReportQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'profit', params],
    queryFn: () => reportsService.getProfitReport(params),
    enabled,
  });
}

export function useTopProducts(limit = 10, params: ReportQueryParams = {}) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'top-products', limit, params],
    queryFn: () => reportsService.getTopProducts(limit, params),
  });
}

export function useCategoryReport(params: ReportQueryParams = {}) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'categories', params],
    queryFn: () => reportsService.getCategoryReport(params),
  });
}

export function useSupplierReport() {
  return useQuery({
    queryKey: [REPORTS_KEY, 'suppliers'],
    queryFn: () => reportsService.getSupplierReport(),
  });
}
