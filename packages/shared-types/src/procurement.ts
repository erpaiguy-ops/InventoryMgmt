/**
 * v2 Phase 4 shared types — procure-to-pay (roadmap M4).
 */

export type PurchaseOrderDocStatus =
  'draft' | 'pending_approval' | 'confirmed' | 'received' | 'cancelled' | 'rejected';

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  taxId: string | null;
  lineTotal: number;
  qtyReceived: number;
  qtyBilled: number;
}

export interface PurchaseOrderDoc {
  id: string;
  docNo: string;
  supplierId: string;
  supplierName?: string;
  warehouseId: string;
  orderDate: string;
  expectedDate: string | null;
  status: PurchaseOrderDocStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  createdAt: string;
  lines: PurchaseOrderLine[];
}

export interface GoodsReceiptLine {
  id: string;
  poLineId: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitCost: number;
  batchNo: string | null;
  expiryDate: string | null;
}

export interface GoodsReceipt {
  id: string;
  docNo: string;
  poId: string;
  poDocNo?: string;
  warehouseId: string;
  status: 'draft' | 'posted';
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  lines: GoodsReceiptLine[];
}

export interface PurchaseBillLine {
  id: string;
  poLineId: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseBill {
  id: string;
  docNo: string;
  poId: string;
  poDocNo?: string;
  supplierId: string;
  supplierName?: string;
  supplierBillNo: string | null;
  billDate: string;
  dueDate: string | null;
  status: 'open' | 'paid' | 'cancelled';
  total: number;
  amountPaid: number;
  /** ISO 4217 code. Totals/balances above are all in this currency — only the GL posting behind the scenes converts to the tenant's base currency. */
  currency: string;
  /** Units of the tenant's base currency per 1 unit of `currency`, captured at bill time. */
  fxRate: number;
  notes: string | null;
  createdAt: string;
  lines: PurchaseBillLine[];
}

export interface PurchaseReturnLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchId: string | null;
  qty: number;
}

export interface PurchaseReturnDoc {
  id: string;
  docNo: string;
  supplierId: string;
  supplierName?: string;
  warehouseId: string;
  reasonCode: string | null;
  reasonText: string | null;
  status: 'posted' | 'cancelled';
  createdAt: string;
  lines: PurchaseReturnLine[];
}

export interface LandedCostVoucher {
  id: string;
  docNo: string;
  grId: string;
  grDocNo?: string;
  description: string;
  amount: number;
  status: 'draft' | 'posted';
  postedAt: string | null;
  createdAt: string;
}
