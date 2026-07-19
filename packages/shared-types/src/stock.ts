/**
 * v2 Phase 3 shared types — the stock engine (M3) and the approvals &
 * workflow engine (M11).
 */

// ---------------------------------------------------------------------------
// Approvals & workflow (M11)
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalDecision = 'approve' | 'reject';

export interface ReasonCode {
  id: string;
  docType: string;
  code: string;
  label: string;
  isActive: boolean;
}

export interface ApprovalWorkflowStep {
  id: string;
  stepNo: number;
  roleId: string;
  roleName?: string;
}

export interface ApprovalWorkflow {
  id: string;
  docType: string;
  isActive: boolean;
  steps: ApprovalWorkflowStep[];
}

export interface ApprovalAction {
  id: string;
  stepNo: number;
  actorId: string | null;
  actorName?: string | null;
  decision: ApprovalDecision;
  comment: string | null;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  docType: string;
  docId: string;
  docNo?: string | null;
  currentStep: number;
  totalSteps: number;
  status: ApprovalStatus;
  reasonCode: string | null;
  reasonText: string | null;
  requestedBy: string | null;
  requestedByName?: string | null;
  createdAt: string;
  decidedAt: string | null;
  actions: ApprovalAction[];
}

// ---------------------------------------------------------------------------
// Stock engine (M3)
// ---------------------------------------------------------------------------

export type StockMovementKind =
  | 'opening'
  | 'adjustment'
  | 'audit'
  | 'transfer_out'
  | 'transfer_in'
  | 'purchase_receipt'
  | 'purchase_return'
  | 'sale_delivery'
  | 'sale_return';

export interface StockBalance {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  warehouseId: string;
  warehouseCode?: string;
  batchId: string | null;
  batchNo?: string | null;
  expiryDate?: string | null;
  qtyOnHand: number;
}

export interface StockLedgerEntry {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  warehouseId: string;
  warehouseCode?: string;
  batchId: string | null;
  qty: number;
  unitCost: number | null;
  movementType: StockMovementKind;
  sourceDocType: string;
  sourceDocId: string;
  notes: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  itemId: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
}

export interface ItemCost {
  itemId: string;
  qtyOnHand: number;
  avgCost: number;
}

export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

export interface StockTransferLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchId: string | null;
  batchNo?: string | null;
  qty: number;
}

export interface StockTransfer {
  id: string;
  docNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  notes: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  lines: StockTransferLine[];
}

export type AdjustmentStatus = 'draft' | 'pending_approval' | 'posted' | 'rejected';

export interface StockAdjustmentLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchNo: string | null;
  expiryDate: string | null;
  qtyChange: number;
  unitCost: number | null;
}

export interface StockAdjustment {
  id: string;
  docNo: string;
  warehouseId: string;
  status: AdjustmentStatus;
  isOpening: boolean;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  lines: StockAdjustmentLine[];
}

export type AuditStatus = 'counting' | 'pending_approval' | 'posted' | 'rejected';

export interface StockAuditLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  batchId: string | null;
  batchNo?: string | null;
  systemQty: number;
  countedQty: number | null;
}

export interface StockAudit {
  id: string;
  docNo: string;
  warehouseId: string;
  status: AuditStatus;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  lines: StockAuditLine[];
}

export interface ReorderRule {
  id: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  warehouseId: string;
  minQty: number;
  reorderQty: number;
  preferredSupplierId: string | null;
}

export interface ReorderSuggestion {
  itemId: string;
  itemSku: string;
  itemName: string;
  warehouseId: string;
  warehouseCode: string;
  qtyOnHand: number;
  minQty: number;
  suggestedQty: number;
  preferredSupplierId: string | null;
}
