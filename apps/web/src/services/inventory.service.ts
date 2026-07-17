import type {
  Inventory,
  PaginatedResult,
  StockMovement,
  StockMovementReferenceType,
  StockMovementType,
} from '@inventory-mgmt/shared-types';

import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export interface ListMovementsParams {
  movementType?: StockMovementType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateStockPayload {
  quantityChange: number;
  movementType: StockMovementType;
  referenceId?: string;
  referenceType?: StockMovementReferenceType;
  notes?: string;
}

export interface AdjustStockPayload {
  productId: string;
  adjustment: number;
  reason: string;
  notes?: string;
}

export interface BulkStockUpdateResult {
  productId: string;
  success: boolean;
  movement?: StockMovement;
  error?: string;
}

export const inventoryService = {
  getAll: () => apiClient.get<Inventory[]>('/inventory'),
  getOne: (productId: string) => apiClient.get<Inventory>(`/inventory/${productId}`),
  getLowStock: (threshold?: number) =>
    apiClient.get<(Inventory & { reorderLevel: number })[]>(
      `/inventory/low-stock${toQueryString({ threshold })}`,
    ),
  getMovements: (productId: string, params: ListMovementsParams = {}) =>
    apiClient.get<PaginatedResult<StockMovement>>(
      `/inventory/movements/${productId}${toQueryString(params)}`,
    ),
  updateStock: (productId: string, payload: UpdateStockPayload) =>
    apiClient.put<{ movement: StockMovement; inventory: Inventory }>(
      `/inventory/${productId}`,
      payload,
    ),
  adjustStock: (payload: AdjustStockPayload) =>
    apiClient.post<{ movement: StockMovement; inventory: Inventory }>('/inventory/adjust', payload),
  bulkUpdateStock: (items: (UpdateStockPayload & { productId: string })[]) =>
    apiClient.post<BulkStockUpdateResult[]>('/inventory/bulk', { items }),
  validateStock: (productId: string, quantity: number) =>
    apiClient.post<{ available: boolean; currentQuantity: number; requestedQuantity: number }>(
      '/inventory/validate',
      { productId, quantity },
    ),
};
