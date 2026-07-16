import type { PaginatedResult, PaginationParams, Product } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export const productsService = {
  list: (params: PaginationParams = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {}),
    ).toString();

    return apiClient.get<PaginatedResult<Product>>(`/products${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (payload: Partial<Product>) => apiClient.post<Product>('/products', payload),
  update: (id: string, payload: Partial<Product>) =>
    apiClient.patch<Product>(`/products/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`/products/${id}`),
};
