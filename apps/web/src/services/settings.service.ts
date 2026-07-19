import type {
  NumberingSeries,
  OrgSettings,
  Tax,
  Uom,
  Warehouse,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface TaxPayload {
  name: string;
  rate: number;
  isInclusive?: boolean;
  isActive?: boolean;
}

export interface UomPayload {
  code: string;
  name: string;
}

export interface WarehousePayload {
  code: string;
  name: string;
  address?: string;
  isActive?: boolean;
}

export interface NumberingSeriesPayload {
  docType: string;
  prefix: string;
  nextNumber?: number;
  padding?: number;
}

export interface OrgSettingsPayload {
  currency?: string;
  fiscalYearStartMonth?: number;
  documentFooter?: string;
}

export const settingsService = {
  listTaxes: () => apiClient.get<Tax[]>('/settings/taxes'),
  createTax: (p: TaxPayload) => apiClient.post<Tax>('/settings/taxes', p),
  updateTax: (id: string, p: Partial<TaxPayload>) => apiClient.put<Tax>(`/settings/taxes/${id}`, p),
  deleteTax: (id: string) => apiClient.delete<void>(`/settings/taxes/${id}`),

  listUoms: () => apiClient.get<Uom[]>('/settings/uoms'),
  createUom: (p: UomPayload) => apiClient.post<Uom>('/settings/uoms', p),
  updateUom: (id: string, p: Partial<UomPayload>) => apiClient.put<Uom>(`/settings/uoms/${id}`, p),
  deleteUom: (id: string) => apiClient.delete<void>(`/settings/uoms/${id}`),

  listWarehouses: () => apiClient.get<Warehouse[]>('/settings/warehouses'),
  createWarehouse: (p: WarehousePayload) => apiClient.post<Warehouse>('/settings/warehouses', p),
  updateWarehouse: (id: string, p: Partial<WarehousePayload>) =>
    apiClient.put<Warehouse>(`/settings/warehouses/${id}`, p),
  deleteWarehouse: (id: string) => apiClient.delete<void>(`/settings/warehouses/${id}`),

  listNumberingSeries: () => apiClient.get<NumberingSeries[]>('/settings/numbering-series'),
  createNumberingSeries: (p: NumberingSeriesPayload) =>
    apiClient.post<NumberingSeries>('/settings/numbering-series', p),
  updateNumberingSeries: (id: string, p: Partial<Omit<NumberingSeriesPayload, 'docType'>>) =>
    apiClient.put<NumberingSeries>(`/settings/numbering-series/${id}`, p),

  getOrgSettings: () => apiClient.get<OrgSettings>('/settings/org'),
  updateOrgSettings: (p: OrgSettingsPayload) => apiClient.put<OrgSettings>('/settings/org', p),
};
