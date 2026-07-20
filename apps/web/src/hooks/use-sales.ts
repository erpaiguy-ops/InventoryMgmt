'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  salesService,
  type DeliveryPayload,
  type InvoicePayload,
  type SalesReturnPayload,
  type SoPayload,
} from '@/services/sales.service';

const SALES = 'sales';

function useInvalidateSales() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [SALES] });
    // Deliveries and returns both move stock and cost.
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['approvals'] });
  };
}

export function useSalesOrders() {
  return useQuery({ queryKey: [SALES, 'orders'], queryFn: () => salesService.listSos() });
}

export function useSalesOrder(id: string | undefined) {
  return useQuery({
    queryKey: [SALES, 'orders', id],
    queryFn: () => salesService.getSo(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateSo() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (p: SoPayload) => salesService.createSo(p),
    onSuccess: invalidate,
  });
}

export function useSubmitSo() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (id: string) => salesService.submitSo(id),
    onSuccess: invalidate,
  });
}

export function useCancelSo() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (id: string) => salesService.cancelSo(id),
    onSuccess: invalidate,
  });
}

export function useDeliveries(soId?: string) {
  return useQuery({
    queryKey: [SALES, 'deliveries', soId],
    queryFn: () => salesService.listDeliveries(soId),
  });
}

export function useDeliverGoods() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (p: DeliveryPayload) => salesService.deliverGoods(p),
    onSuccess: invalidate,
  });
}

export function useSalesInvoices() {
  return useQuery({ queryKey: [SALES, 'invoices'], queryFn: () => salesService.listInvoices() });
}

export function useCreateInvoice() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (p: InvoicePayload) => salesService.createInvoice(p),
    onSuccess: invalidate,
  });
}

export function useSalesReturns() {
  return useQuery({ queryKey: [SALES, 'returns'], queryFn: () => salesService.listReturns() });
}

export function useCreateSalesReturn() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: (p: SalesReturnPayload) => salesService.createReturn(p),
    onSuccess: invalidate,
  });
}
