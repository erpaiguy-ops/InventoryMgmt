import type {
  PaginatedResult,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from '@inventory-mgmt/shared-types';

import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export type SalesOrderWithItems = SalesOrder & { items: SalesOrderItem[] };

export interface ListSalesOrdersParams {
  status?: SalesOrderStatus;
  customerEmail?: string;
  page?: number;
  pageSize?: number;
}

export interface SalesOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalesOrderPayload {
  customerName: string;
  customerEmail?: string;
  notes?: string;
  items: SalesOrderItemPayload[];
}

export const salesOrdersService = {
  list: (params: ListSalesOrdersParams = {}) =>
    apiClient.get<PaginatedResult<SalesOrder>>(`/sales-orders${toQueryString(params)}`),
  get: (id: string) => apiClient.get<SalesOrderWithItems>(`/sales-orders/${id}`),
  getByCustomer: (email: string) =>
    apiClient.get<SalesOrder[]>(`/sales-orders/customer/${encodeURIComponent(email)}`),
  getStats: () =>
    apiClient.get<{ totalOrders: number; totalValue: number; byStatus: Record<string, number> }>(
      '/sales-orders/stats',
    ),
  create: (payload: CreateSalesOrderPayload) =>
    apiClient.post<SalesOrderWithItems>('/sales-orders', payload),
  update: (id: string, payload: Partial<CreateSalesOrderPayload>) =>
    apiClient.put<SalesOrderWithItems>(`/sales-orders/${id}`, payload),
  updateStatus: (
    id: string,
    status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
  ) => apiClient.put<SalesOrder>(`/sales-orders/${id}/status`, { status }),
  confirm: (id: string) => apiClient.post<SalesOrder>(`/sales-orders/${id}/confirm`),
  ship: (id: string) => apiClient.post<SalesOrder>(`/sales-orders/${id}/ship`),
  deliver: (id: string) => apiClient.post<SalesOrder>(`/sales-orders/${id}/deliver`),
  cancel: (id: string) => apiClient.post<SalesOrder>(`/sales-orders/${id}/cancel`),
  deleteDraft: (id: string) => apiClient.delete<void>(`/sales-orders/${id}`),
};
