import type {
  DeliveryNote,
  SalesInvoice,
  SalesOrderDoc,
  SalesReturnDoc,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface SoPayload {
  customerId: string;
  warehouseId: string;
  expectedDate?: string;
  notes?: string;
  lines: { itemId: string; qty: number; unitPrice: number; taxId?: string }[];
}

export interface DeliveryPayload {
  soId: string;
  warehouseId?: string;
  notes?: string;
  lines: { soLineId: string; qty: number; batchId?: string }[];
}

export interface InvoicePayload {
  soId: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  lines: { soLineId: string; qty: number; unitPrice?: number }[];
}

export interface SalesReturnPayload {
  customerId: string;
  warehouseId: string;
  reasonCodeId?: string;
  reasonText?: string;
  lines: { itemId: string; batchId?: string; qty: number }[];
}

export const salesService = {
  listSos: () => apiClient.get<SalesOrderDoc[]>('/sales/orders'),
  getSo: (id: string) => apiClient.get<SalesOrderDoc>(`/sales/orders/${id}`),
  createSo: (p: SoPayload) => apiClient.post<SalesOrderDoc>('/sales/orders', p),
  submitSo: (id: string) => apiClient.post<SalesOrderDoc>(`/sales/orders/${id}/submit`),
  cancelSo: (id: string) => apiClient.post<SalesOrderDoc>(`/sales/orders/${id}/cancel`),

  listDeliveries: (soId?: string) =>
    apiClient.get<DeliveryNote[]>(
      `/sales/deliveries${soId ? `?soId=${encodeURIComponent(soId)}` : ''}`,
    ),
  deliverGoods: (p: DeliveryPayload) => apiClient.post<DeliveryNote>('/sales/deliveries', p),

  listInvoices: () => apiClient.get<SalesInvoice[]>('/sales/invoices'),
  createInvoice: (p: InvoicePayload) => apiClient.post<SalesInvoice>('/sales/invoices', p),

  listReturns: () => apiClient.get<SalesReturnDoc[]>('/sales/returns'),
  createReturn: (p: SalesReturnPayload) => apiClient.post<SalesReturnDoc[]>('/sales/returns', p),
};
