'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  financialsService,
  type CreateAccountPayload,
  type CreateApPaymentPayload,
  type CreateArReceiptPayload,
  type CreateBankAccountPayload,
  type CreateBankTransactionPayload,
  type CreateCostCenterPayload,
  type CreateJournalEntryPayload,
  type CreatePaymentMethodPayload,
  type ImportBankFeedPayload,
  type UpdateAccountPayload,
} from '@/services/financials.service';

const FIN = 'financials';

function useInvalidateFinancials() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [FIN] });
}

export function useAccounts() {
  return useQuery({ queryKey: [FIN, 'accounts'], queryFn: () => financialsService.listAccounts() });
}

export function useCreateAccount() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateAccountPayload) => financialsService.createAccount(p),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & UpdateAccountPayload) =>
      financialsService.updateAccount(id, p),
    onSuccess: invalidate,
  });
}

export function useCostCenters() {
  return useQuery({
    queryKey: [FIN, 'cost-centers'],
    queryFn: () => financialsService.listCostCenters(),
  });
}

export function useCreateCostCenter() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateCostCenterPayload) => financialsService.createCostCenter(p),
    onSuccess: invalidate,
  });
}

export function useJournalEntries() {
  return useQuery({
    queryKey: [FIN, 'journal-entries'],
    queryFn: () => financialsService.listJournalEntries(),
  });
}

export function useCreateManualEntry() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateJournalEntryPayload) => financialsService.createManualEntry(p),
    onSuccess: invalidate,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: [FIN, 'payment-methods'],
    queryFn: () => financialsService.listPaymentMethods(),
  });
}

export function useCreatePaymentMethod() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreatePaymentMethodPayload) => financialsService.createPaymentMethod(p),
    onSuccess: invalidate,
  });
}

export function useBankAccounts() {
  return useQuery({
    queryKey: [FIN, 'bank-accounts'],
    queryFn: () => financialsService.listBankAccounts(),
  });
}

export function useCreateBankAccount() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateBankAccountPayload) => financialsService.createBankAccount(p),
    onSuccess: invalidate,
  });
}

export function useBankTransactions(bankAccountId?: string) {
  return useQuery({
    queryKey: [FIN, 'bank-transactions', bankAccountId],
    queryFn: () => financialsService.listBankTransactions(bankAccountId),
  });
}

export function useCreateBankTransaction() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateBankTransactionPayload) => financialsService.createBankTransaction(p),
    onSuccess: invalidate,
  });
}

export function useReconcileBankTransaction() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (id: string) => financialsService.reconcileBankTransaction(id),
    onSuccess: invalidate,
  });
}

export function useImportBankFeed() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: ImportBankFeedPayload) => financialsService.importBankFeed(p),
    onSuccess: invalidate,
  });
}

export function useMatchBankTransaction() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: ({ feedTxnId, targetId }: { feedTxnId: string; targetId: string }) =>
      financialsService.matchBankTransaction(feedTxnId, targetId),
    onSuccess: invalidate,
  });
}

export function useArReceipts() {
  return useQuery({
    queryKey: [FIN, 'ar-receipts'],
    queryFn: () => financialsService.listArReceipts(),
  });
}

export function useCreateArReceipt() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateArReceiptPayload) => financialsService.createArReceipt(p),
    onSuccess: invalidate,
  });
}

export function useApPayments() {
  return useQuery({
    queryKey: [FIN, 'ap-payments'],
    queryFn: () => financialsService.listApPayments(),
  });
}

export function useCreateApPayment() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (p: CreateApPaymentPayload) => financialsService.createApPayment(p),
    onSuccess: invalidate,
  });
}

export function useArAging() {
  return useQuery({ queryKey: [FIN, 'ar-aging'], queryFn: () => financialsService.arAging() });
}

export function useApAging() {
  return useQuery({ queryKey: [FIN, 'ap-aging'], queryFn: () => financialsService.apAging() });
}

export function useFiscalPeriods() {
  return useQuery({
    queryKey: [FIN, 'fiscal-periods'],
    queryFn: () => financialsService.listFiscalPeriods(),
  });
}

export function useClosePeriod() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (periodStart: string) => financialsService.closePeriod(periodStart),
    onSuccess: invalidate,
  });
}

export function useBalanceSheet(asOf: string) {
  return useQuery({
    queryKey: [FIN, 'balance-sheet', asOf],
    queryFn: () => financialsService.balanceSheet(asOf),
    enabled: Boolean(asOf),
  });
}

export function useProfitAndLoss(from: string, to: string, costCenterId?: string) {
  return useQuery({
    queryKey: [FIN, 'profit-and-loss', from, to, costCenterId],
    queryFn: () => financialsService.profitAndLoss(from, to, costCenterId),
    enabled: Boolean(from && to),
  });
}
