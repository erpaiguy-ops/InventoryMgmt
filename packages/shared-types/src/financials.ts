/**
 * v2 Phase 6 shared types — Financials (roadmap M7).
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  parentAccountId: string | null;
  systemRole: string | null;
  isSystem: boolean;
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  centerType: 'general' | 'vehicle' | 'department' | 'project';
  isActive: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  costCenterId: string | null;
  partnerId: string | null;
  debit: number;
  credit: number;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  entryDate: string;
  sourceDocType: string;
  sourceDocId: string | null;
  memo: string | null;
  createdAt: string;
  lines: JournalEntryLine[];
}

export interface FiscalPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'open' | 'closed';
}

export interface PaymentMethod {
  id: string;
  name: string;
  methodType: 'cash' | 'bank' | 'card' | 'cheque' | 'other';
  bankAccountId: string | null;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string | null;
  accountId: string;
  openingBalance: number;
  isActive: boolean;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  txnDate: string;
  description: string | null;
  amount: number;
  source: 'manual' | 'receipt' | 'payment';
  sourceDocType: string | null;
  sourceDocId: string | null;
  isReconciled: boolean;
  reconciledAt: string | null;
  createdAt: string;
}

export interface ArReceiptAllocation {
  id: string;
  invoiceId: string;
  invoiceDocNo?: string;
  amount: number;
}

export interface ArReceipt {
  id: string;
  docNo: string;
  customerId: string;
  customerName?: string;
  receiptDate: string;
  amount: number;
  paymentMethodId: string | null;
  notes: string | null;
  createdAt: string;
  allocations: ArReceiptAllocation[];
}

export interface ApPaymentAllocation {
  id: string;
  billId: string;
  billDocNo?: string;
  amount: number;
}

export interface ApPayment {
  id: string;
  docNo: string;
  supplierId: string;
  supplierName?: string;
  paymentDate: string;
  amount: number;
  paymentMethodId: string | null;
  notes: string | null;
  createdAt: string;
  allocations: ApPaymentAllocation[];
}

export interface AgingRow {
  docId: string;
  docNo: string;
  partnerId: string;
  partnerName?: string;
  dueDate: string | null;
  total: number;
  amountPaid: number;
  balance: number;
  daysOverdue: number;
  bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
}

export interface ReportRow {
  accountId: string;
  code: string;
  name: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  balance: number;
}
