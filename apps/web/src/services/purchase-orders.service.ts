import type {
  PaginatedResult,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '@inventory-mgmt/shared-types';

import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export type PurchaseOrderWithItems = PurchaseOrder & { items: PurchaseOrderItem[] };

export interface ListPurchaseOrdersParams {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  page?: number;
  pageSize?: number;
}

export interface PurchaseOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  expectedDelivery?: string;
  notes?: string;
  items: PurchaseOrderItemPayload[];
}

export interface ReceivePurchaseOrderPayload {
  receivedItems: { productId: string; quantityReceived: number }[];
}

export const purchaseOrdersService = {
  list: (params: ListPurchaseOrdersParams = {}) =>
    apiClient.get<PaginatedResult<PurchaseOrder>>(`/purchase-orders${toQueryString(params)}`),
  get: (id: string) => apiClient.get<PurchaseOrderWithItems>(`/purchase-orders/${id}`),
  getBySupplier: (supplierId: string) =>
    apiClient.get<PurchaseOrder[]>(`/purchase-orders/supplier/${supplierId}`),
  getStats: () =>
    apiClient.get<{ totalOrders: number; totalValue: number; byStatus: Record<string, number> }>(
      '/purchase-orders/stats',
    ),
  create: (payload: CreatePurchaseOrderPayload) =>
    apiClient.post<PurchaseOrderWithItems>('/purchase-orders', payload),
  update: (id: string, payload: Partial<CreatePurchaseOrderPayload>) =>
    apiClient.put<PurchaseOrderWithItems>(`/purchase-orders/${id}`, payload),
  updateStatus: (id: string, status: 'draft' | 'pending' | 'cancelled') =>
    apiClient.put<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
  receive: (id: string, payload: ReceivePurchaseOrderPayload) =>
    apiClient.post<PurchaseOrderWithItems>(`/purchase-orders/${id}/receive`, payload),
  deleteDraft: (id: string) => apiClient.delete<void>(`/purchase-orders/${id}`),
};
