import type {
  Batch,
  ReorderRule,
  ReorderSuggestion,
  StockAdjustment,
  StockAudit,
  StockBalance,
  StockLedgerEntry,
  StockTransfer,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface TransferPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  lines: { itemId: string; batchId?: string; qty: number }[];
}

export interface AdjustmentPayload {
  warehouseId: string;
  isOpening?: boolean;
  notes?: string;
  lines: {
    itemId: string;
    batchNo?: string;
    expiryDate?: string;
    qtyChange: number;
    unitCost?: number;
  }[];
}

export interface SubmitApprovalPayload {
  reasonCodeId?: string;
  reasonText?: string;
}

export interface ReorderRulePayload {
  itemId: string;
  warehouseId: string;
  minQty: number;
  reorderQty: number;
  preferredSupplierId?: string;
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const inventoryService = {
  balances: (warehouseId?: string) =>
    apiClient.get<StockBalance[]>(`/inventory/balances${query({ warehouseId })}`),
  ledger: (filters: { itemId?: string; warehouseId?: string } = {}) =>
    apiClient.get<StockLedgerEntry[]>(`/inventory/ledger${query(filters)}`),
  batches: (itemId?: string) => apiClient.get<Batch[]>(`/inventory/batches${query({ itemId })}`),

  listTransfers: () => apiClient.get<StockTransfer[]>('/inventory/transfers'),
  createTransfer: (p: TransferPayload) => apiClient.post<StockTransfer>('/inventory/transfers', p),
  dispatchTransfer: (id: string) =>
    apiClient.post<StockTransfer>(`/inventory/transfers/${id}/dispatch`),
  receiveTransfer: (id: string) =>
    apiClient.post<StockTransfer>(`/inventory/transfers/${id}/receive`),

  listAdjustments: () => apiClient.get<StockAdjustment[]>('/inventory/adjustments'),
  createAdjustment: (p: AdjustmentPayload) =>
    apiClient.post<StockAdjustment>('/inventory/adjustments', p),
  submitAdjustment: (id: string, p: SubmitApprovalPayload) =>
    apiClient.post<StockAdjustment>(`/inventory/adjustments/${id}/submit`, p),

  listAudits: () => apiClient.get<StockAudit[]>('/inventory/audits'),
  createAudit: (p: { warehouseId: string; notes?: string }) =>
    apiClient.post<StockAudit>('/inventory/audits', p),
  getAudit: (id: string) => apiClient.get<StockAudit>(`/inventory/audits/${id}`),
  enterCounts: (id: string, counts: { lineId: string; countedQty: number }[]) =>
    apiClient.put<StockAudit>(`/inventory/audits/${id}/counts`, { counts }),
  submitAudit: (id: string, p: SubmitApprovalPayload) =>
    apiClient.post<StockAudit>(`/inventory/audits/${id}/submit`, p),

  listReorderRules: () => apiClient.get<ReorderRule[]>('/inventory/reorder-rules'),
  upsertReorderRule: (p: ReorderRulePayload) =>
    apiClient.put<ReorderRule[]>('/inventory/reorder-rules', p),
  reorderSuggestions: () => apiClient.get<ReorderSuggestion[]>('/inventory/reorder-suggestions'),
};
