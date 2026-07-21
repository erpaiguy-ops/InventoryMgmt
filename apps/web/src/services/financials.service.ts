import type {
  Account,
  AgingRow,
  ApPayment,
  ArReceipt,
  BankAccount,
  BankFeedRow,
  BankTransaction,
  CostCenter,
  FiscalPeriod,
  JournalEntry,
  PaymentMethod,
  ReportRow,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface CreateAccountPayload {
  code: string;
  name: string;
  accountType: Account['accountType'];
  normalBalance: Account['normalBalance'];
  parentAccountId?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  isActive?: boolean;
}

export interface CreateCostCenterPayload {
  code: string;
  name: string;
  centerType?: CostCenter['centerType'];
}

export interface JournalLinePayload {
  accountId: string;
  costCenterId?: string;
  partnerId?: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface CreateJournalEntryPayload {
  entryDate?: string;
  memo: string;
  lines: JournalLinePayload[];
}

export interface CreatePaymentMethodPayload {
  name: string;
  methodType: PaymentMethod['methodType'];
  bankAccountId?: string;
}

export interface CreateBankAccountPayload {
  name: string;
  accountNumber?: string;
  accountId: string;
  openingBalance?: number;
}

export interface CreateBankTransactionPayload {
  bankAccountId: string;
  txnDate?: string;
  description?: string;
  amount: number;
  reference?: string;
}

export interface ImportBankFeedPayload {
  bankAccountId: string;
  rows: BankFeedRow[];
}

export interface CreateArReceiptPayload {
  customerId: string;
  receiptDate?: string;
  amount: number;
  currency?: string;
  fxRate?: number;
  paymentMethodId: string;
  depositAccountId: string;
  notes?: string;
  allocations: { invoiceId: string; amount: number }[];
}

export interface CreateApPaymentPayload {
  supplierId: string;
  paymentDate?: string;
  amount: number;
  currency?: string;
  fxRate?: number;
  paymentMethodId: string;
  sourceAccountId: string;
  notes?: string;
  allocations: { billId: string; amount: number }[];
}

export const financialsService = {
  listAccounts: () => apiClient.get<Account[]>('/financials/accounts'),
  createAccount: (p: CreateAccountPayload) => apiClient.post<Account>('/financials/accounts', p),
  updateAccount: (id: string, p: UpdateAccountPayload) =>
    apiClient.put<Account>(`/financials/accounts/${id}`, p),

  listCostCenters: () => apiClient.get<CostCenter[]>('/financials/cost-centers'),
  createCostCenter: (p: CreateCostCenterPayload) =>
    apiClient.post<CostCenter>('/financials/cost-centers', p),

  listJournalEntries: () => apiClient.get<JournalEntry[]>('/financials/journal-entries'),
  createManualEntry: (p: CreateJournalEntryPayload) =>
    apiClient.post<JournalEntry>('/financials/journal-entries', p),

  listPaymentMethods: () => apiClient.get<PaymentMethod[]>('/financials/payment-methods'),
  createPaymentMethod: (p: CreatePaymentMethodPayload) =>
    apiClient.post<PaymentMethod>('/financials/payment-methods', p),

  listBankAccounts: () => apiClient.get<BankAccount[]>('/financials/bank-accounts'),
  createBankAccount: (p: CreateBankAccountPayload) =>
    apiClient.post<BankAccount>('/financials/bank-accounts', p),

  listBankTransactions: (bankAccountId?: string) =>
    apiClient.get<BankTransaction[]>(
      `/financials/bank-transactions${bankAccountId ? `?bankAccountId=${encodeURIComponent(bankAccountId)}` : ''}`,
    ),
  createBankTransaction: (p: CreateBankTransactionPayload) =>
    apiClient.post<BankTransaction>('/financials/bank-transactions', p),
  reconcileBankTransaction: (id: string) =>
    apiClient.post<BankTransaction>(`/financials/bank-transactions/${id}/reconcile`),
  importBankFeed: (p: ImportBankFeedPayload) =>
    apiClient.post<{ imported: number }>('/financials/bank-transactions/import', p),
  matchBankTransaction: (feedTxnId: string, targetId: string) =>
    apiClient.post<void>(`/financials/bank-transactions/${feedTxnId}/match`, { targetId }),

  listArReceipts: () => apiClient.get<ArReceipt[]>('/financials/ar-receipts'),
  createArReceipt: (p: CreateArReceiptPayload) =>
    apiClient.post<ArReceipt>('/financials/ar-receipts', p),

  listApPayments: () => apiClient.get<ApPayment[]>('/financials/ap-payments'),
  createApPayment: (p: CreateApPaymentPayload) =>
    apiClient.post<ApPayment>('/financials/ap-payments', p),

  arAging: () => apiClient.get<AgingRow[]>('/financials/reports/ar-aging'),
  apAging: () => apiClient.get<AgingRow[]>('/financials/reports/ap-aging'),

  listFiscalPeriods: () => apiClient.get<FiscalPeriod[]>('/financials/fiscal-periods'),
  closePeriod: (periodStart: string) =>
    apiClient.post<void>('/financials/fiscal-periods/close', { periodStart }),

  balanceSheet: (asOf: string) =>
    apiClient.get<ReportRow[]>(`/financials/reports/balance-sheet?asOf=${asOf}`),
  profitAndLoss: (from: string, to: string, costCenterId?: string) =>
    apiClient.get<ReportRow[]>(
      `/financials/reports/profit-and-loss?from=${from}&to=${to}${
        costCenterId ? `&costCenterId=${encodeURIComponent(costCenterId)}` : ''
      }`,
    ),
};
