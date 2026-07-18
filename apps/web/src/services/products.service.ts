import type { Inventory, PaginatedResult, Product } from '@inventory-mgmt/shared-types';

import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export type ProductWithInventory = Product & { inventory: Inventory | null };

export interface ListProductsParams {
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProductPayload {
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  costPrice?: number;
  reorderLevel?: number;
}

export const productsService = {
  list: (params: ListProductsParams = {}) =>
    apiClient.get<PaginatedResult<ProductWithInventory>>(`/products${toQueryString(params)}`),
  get: (id: string) => apiClient.get<ProductWithInventory>(`/products/${id}`),
  getBySku: (sku: string) => apiClient.get<ProductWithInventory>(`/products/sku/${sku}`),
  getCategories: () => apiClient.get<string[]>('/products/categories'),
  getLowStock: () => apiClient.get<ProductWithInventory[]>('/products/low-stock'),
  getStockValue: () =>
    apiClient.get<{ totalUnits: number; totalCostValue: number; totalRetailValue: number }>(
      '/products/stock-value',
    ),
  create: (payload: ProductPayload) => apiClient.post<Product>('/products', payload),
  bulkCreate: (products: ProductPayload[]) =>
    apiClient.post<Product[]>('/products/bulk', { products }),
  update: (id: string, payload: Partial<ProductPayload>) =>
    apiClient.put<Product>(`/products/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`/products/${id}`),
};
