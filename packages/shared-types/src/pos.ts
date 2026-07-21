/**
 * v2 Phase 12 shared types — POS / Counter Sales (roadmap M14).
 */

export interface CashDrawerSession {
  id: string;
  openingFloat: number;
  status: 'open' | 'closed';
  closingCounted: number | null;
  closingExpected: number | null;
  overShort: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface PosSaleLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  taxId: string | null;
  lineTotal: number;
}

export interface PosSale {
  id: string;
  docNo: string;
  sessionId: string;
  customerId: string | null;
  customerName?: string;
  warehouseId: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: 'draft' | 'posted';
  postedAt: string | null;
  createdAt: string;
  lines: PosSaleLine[];
}
