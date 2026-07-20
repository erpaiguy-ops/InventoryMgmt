import type {
  GoodsReceipt,
  LandedCostVoucher,
  PurchaseBill,
  PurchaseOrderDoc,
  PurchaseReturnDoc,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface PoPayload {
  supplierId: string;
  warehouseId: string;
  expectedDate?: string;
  notes?: string;
  lines: { itemId: string; qty: number; unitPrice: number; taxId?: string }[];
}

export interface GrnPayload {
  poId: string;
  notes?: string;
  lines: {
    poLineId: string;
    qty: number;
    unitCost?: number;
    batchNo?: string;
    expiryDate?: string;
  }[];
}

export interface BillPayload {
  poId: string;
  supplierBillNo?: string;
  billDate?: string;
  dueDate?: string;
  notes?: string;
  lines: { poLineId: string; qty: number; unitPrice?: number }[];
}

export interface ReturnPayload {
  supplierId: string;
  warehouseId: string;
  reasonCodeId?: string;
  reasonText?: string;
  lines: { itemId: string; batchId?: string; qty: number }[];
}

export interface LandedCostPayload {
  grId: string;
  description: string;
  amount: number;
}

export const procurementService = {
  listPos: () => apiClient.get<PurchaseOrderDoc[]>('/procurement/purchase-orders'),
  getPo: (id: string) => apiClient.get<PurchaseOrderDoc>(`/procurement/purchase-orders/${id}`),
  createPo: (p: PoPayload) => apiClient.post<PurchaseOrderDoc>('/procurement/purchase-orders', p),
  submitPo: (id: string) =>
    apiClient.post<PurchaseOrderDoc>(`/procurement/purchase-orders/${id}/submit`),
  cancelPo: (id: string) =>
    apiClient.post<PurchaseOrderDoc>(`/procurement/purchase-orders/${id}/cancel`),

  listGrns: (poId?: string) =>
    apiClient.get<GoodsReceipt[]>(
      `/procurement/goods-receipts${poId ? `?poId=${encodeURIComponent(poId)}` : ''}`,
    ),
  receiveGoods: (p: GrnPayload) => apiClient.post<GoodsReceipt>('/procurement/goods-receipts', p),

  listBills: () => apiClient.get<PurchaseBill[]>('/procurement/bills'),
  createBill: (p: BillPayload) => apiClient.post<PurchaseBill>('/procurement/bills', p),

  listReturns: () => apiClient.get<PurchaseReturnDoc[]>('/procurement/returns'),
  createReturn: (p: ReturnPayload) =>
    apiClient.post<PurchaseReturnDoc[]>('/procurement/returns', p),

  listLandedCosts: () => apiClient.get<LandedCostVoucher[]>('/procurement/landed-costs'),
  addLandedCost: (p: LandedCostPayload) =>
    apiClient.post<LandedCostVoucher[]>('/procurement/landed-costs', p),
};
