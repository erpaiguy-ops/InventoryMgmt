/**
 * v2 Phase 5 shared types — order-to-cash (roadmap M5).
 */

export type SalesOrderDocStatus =
  'draft' | 'pending_approval' | 'confirmed' | 'delivered' | 'cancelled' | 'rejected';

export interface SalesOrderLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  taxId: string | null;
  lineTotal: number;
  qtyDelivered: number;
  qtyInvoiced: number;
}

export interface SalesOrderDoc {
  id: string;
  docNo: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  orderDate: string;
  expectedDate: string | null;
  status: SalesOrderDocStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  createdAt: string;
  lines: SalesOrderLine[];
}

export interface DeliveryLine {
  id: string;
  soLineId: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchId: string | null;
  qty: number;
}

export interface DeliveryNote {
  id: string;
  docNo: string;
  soId: string;
  soDocNo?: string;
  warehouseId: string;
  status: 'draft' | 'posted';
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  lines: DeliveryLine[];
}

export interface SalesInvoiceLine {
  id: string;
  soLineId: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesInvoice {
  id: string;
  docNo: string;
  soId: string;
  soDocNo?: string;
  customerId: string;
  customerName?: string;
  invoiceDate: string;
  dueDate: string | null;
  status: 'open' | 'paid' | 'cancelled';
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  createdAt: string;
  lines: SalesInvoiceLine[];
}

export interface SalesReturnLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchId: string | null;
  qty: number;
}

export interface SalesReturnDoc {
  id: string;
  docNo: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  reasonCode: string | null;
  reasonText: string | null;
  status: 'draft' | 'pending_approval' | 'posted' | 'rejected';
  postedAt: string | null;
  createdAt: string;
  lines: SalesReturnLine[];
}
