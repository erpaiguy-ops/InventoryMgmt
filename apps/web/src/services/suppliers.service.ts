import type { PaginatedResult, Supplier } from '@inventory-mgmt/shared-types';

import { toQueryString } from '@/utils/query-string';

import { apiClient } from './api-client';

export interface ListSuppliersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SupplierPayload {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const suppliersService = {
  list: (params: ListSuppliersParams = {}) =>
    apiClient.get<PaginatedResult<Supplier>>(`/suppliers${toQueryString(params)}`),
  get: (id: string) => apiClient.get<Supplier>(`/suppliers/${id}`),
  create: (payload: SupplierPayload) => apiClient.post<Supplier>('/suppliers', payload),
  update: (id: string, payload: Partial<SupplierPayload>) =>
    apiClient.put<Supplier>(`/suppliers/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`/suppliers/${id}`),
};
