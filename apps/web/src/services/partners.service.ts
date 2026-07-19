import type {
  PaginatedResult,
  Partner,
  PartnerAddressType,
  PartnerGroup,
  PartnerStatus,
  PartnerWithDetails,
  PaymentTerm,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface PartnerPayload {
  code?: string;
  name: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
  taxIdNumber?: string;
  email?: string;
  phone?: string;
  currency?: string;
  paymentTermId?: string;
  creditLimit?: number;
  priceListId?: string;
  groupId?: string;
  status?: PartnerStatus;
  notes?: string;
  contacts?: {
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
  }[];
  addresses?: {
    addressType: PartnerAddressType;
    line1: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    isDefault?: boolean;
  }[];
}

export interface ListPartnersParams {
  search?: string;
  role?: 'customer' | 'supplier';
  status?: PartnerStatus;
  page?: number;
  pageSize?: number;
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const partnersService = {
  list: (params: ListPartnersParams = {}) =>
    apiClient.get<PaginatedResult<Partner>>(`/partners${toQuery(params)}`),
  get: (id: string) => apiClient.get<PartnerWithDetails>(`/partners/${id}`),
  create: (p: PartnerPayload) => apiClient.post<PartnerWithDetails>('/partners', p),
  bulkCreate: (partners: PartnerPayload[]) =>
    apiClient.post<{ created: number }>('/partners/bulk', { partners }),
  update: (id: string, p: Partial<PartnerPayload>) =>
    apiClient.put<PartnerWithDetails>(`/partners/${id}`, p),
  remove: (id: string) => apiClient.delete<void>(`/partners/${id}`),

  listPaymentTerms: () => apiClient.get<PaymentTerm[]>('/partners/payment-terms'),
  createPaymentTerm: (p: {
    name: string;
    netDays: number;
    earlyPayDiscountPct?: number;
    earlyPayWithinDays?: number;
  }) => apiClient.post<PaymentTerm>('/partners/payment-terms', p),
  deletePaymentTerm: (id: string) => apiClient.delete<void>(`/partners/payment-terms/${id}`),

  listGroups: () => apiClient.get<PartnerGroup[]>('/partners/groups'),
  createGroup: (name: string) => apiClient.post<PartnerGroup>('/partners/groups', { name }),
  deleteGroup: (id: string) => apiClient.delete<void>(`/partners/groups/${id}`),
};
