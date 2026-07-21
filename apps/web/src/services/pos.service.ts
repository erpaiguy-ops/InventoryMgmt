import type { CashDrawerSession, PosSale } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface OpenSessionPayload {
  openingFloat: number;
}

export interface CloseSessionPayload {
  countedAmount: number;
}

export interface PosSaleLinePayload {
  itemId: string;
  qty: number;
  unitPrice: number;
  taxId?: string;
}

export interface CreatePosSalePayload {
  sessionId: string;
  customerId?: string;
  warehouseId: string;
  paymentMethodId: string;
  depositAccountId: string;
  lines: PosSaleLinePayload[];
}

export const posService = {
  listSessions: () => apiClient.get<CashDrawerSession[]>('/pos/sessions'),
  openSession: (p: OpenSessionPayload) => apiClient.post<CashDrawerSession>('/pos/sessions', p),
  closeSession: (id: string, p: CloseSessionPayload) =>
    apiClient.post<CashDrawerSession>(`/pos/sessions/${id}/close`, p),

  listSales: (sessionId?: string) =>
    apiClient.get<PosSale[]>(
      `/pos/sales${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`,
    ),
  createSale: (p: CreatePosSalePayload) => apiClient.post<PosSale>('/pos/sales', p),
};
