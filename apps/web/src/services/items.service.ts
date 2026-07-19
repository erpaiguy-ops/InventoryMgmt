import type {
  Brand,
  CategoryAttribute,
  Item,
  ItemStatus,
  ItemWithDetails,
  ItemCategory,
  PaginatedResult,
  PriceList,
  PriceListItem,
  PriceListType,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface ItemPayload {
  sku?: string;
  name: string;
  description?: string;
  itemType?: 'stocked' | 'service';
  categoryId?: string;
  brandId?: string;
  baseUomId: string;
  purchaseUomId?: string;
  salesUomId?: string;
  taxId?: string;
  tracking?: 'none' | 'batch' | 'serial';
  trackExpiry?: boolean;
  attributes?: Record<string, unknown>;
  standardCost?: number;
  standardPrice?: number;
  status?: ItemStatus;
  uoms?: { uomId: string; factorToBase: number }[];
  barcodes?: { barcode: string; uomId?: string }[];
}

export interface ListItemsParams {
  search?: string;
  categoryId?: string;
  status?: ItemStatus;
  page?: number;
  pageSize?: number;
}

export interface CategoryPayload {
  name: string;
  parentId?: string;
  attributeSchema?: CategoryAttribute[];
}

export interface PriceListPayload {
  name: string;
  listType: PriceListType;
  currency?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PricePayload {
  itemId: string;
  uomId?: string;
  minQty?: number;
  unitPrice: number;
  validFrom?: string;
  validTo?: string;
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const itemsService = {
  list: (params: ListItemsParams = {}) =>
    apiClient.get<PaginatedResult<Item>>(`/items${toQuery(params)}`),
  get: (id: string) => apiClient.get<ItemWithDetails>(`/items/${id}`),
  create: (p: ItemPayload) => apiClient.post<ItemWithDetails>('/items', p),
  bulkCreate: (items: ItemPayload[]) =>
    apiClient.post<{ created: number }>('/items/bulk', { items }),
  update: (id: string, p: Partial<ItemPayload>) =>
    apiClient.put<ItemWithDetails>(`/items/${id}`, p),
  remove: (id: string) => apiClient.delete<void>(`/items/${id}`),

  listCategories: () => apiClient.get<ItemCategory[]>('/items/categories'),
  createCategory: (p: CategoryPayload) => apiClient.post<ItemCategory>('/items/categories', p),
  updateCategory: (id: string, p: Partial<CategoryPayload>) =>
    apiClient.put<ItemCategory>(`/items/categories/${id}`, p),
  deleteCategory: (id: string) => apiClient.delete<void>(`/items/categories/${id}`),

  listBrands: () => apiClient.get<Brand[]>('/items/brands'),
  createBrand: (name: string) => apiClient.post<Brand>('/items/brands', { name }),
  deleteBrand: (id: string) => apiClient.delete<void>(`/items/brands/${id}`),

  listPriceLists: () => apiClient.get<PriceList[]>('/items/price-lists'),
  createPriceList: (p: PriceListPayload) => apiClient.post<PriceList>('/items/price-lists', p),
  updatePriceList: (id: string, p: Partial<Omit<PriceListPayload, 'listType'>>) =>
    apiClient.put<PriceList>(`/items/price-lists/${id}`, p),
  listPrices: (priceListId: string) =>
    apiClient.get<PriceListItem[]>(`/items/price-lists/${priceListId}/prices`),
  setPrices: (priceListId: string, prices: PricePayload[]) =>
    apiClient.put<PriceListItem[]>(`/items/price-lists/${priceListId}/prices`, { prices }),
};
