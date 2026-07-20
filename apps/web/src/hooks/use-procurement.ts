'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  procurementService,
  type BillPayload,
  type GrnPayload,
  type LandedCostPayload,
  type PoPayload,
  type ReturnPayload,
} from '@/services/procurement.service';

const PROC = 'procurement';

function useInvalidateProcurement() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [PROC] });
    // Receipts, returns and landed costs all move stock and cost.
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };
}

export function usePurchaseOrders() {
  return useQuery({ queryKey: [PROC, 'pos'], queryFn: () => procurementService.listPos() });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [PROC, 'pos', id],
    queryFn: () => procurementService.getPo(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePo() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (p: PoPayload) => procurementService.createPo(p),
    onSuccess: invalidate,
  });
}

export function useSubmitPo() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (id: string) => procurementService.submitPo(id),
    onSuccess: invalidate,
  });
}

export function useCancelPo() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (id: string) => procurementService.cancelPo(id),
    onSuccess: invalidate,
  });
}

export function useGoodsReceipts(poId?: string) {
  return useQuery({
    queryKey: [PROC, 'grns', poId],
    queryFn: () => procurementService.listGrns(poId),
  });
}

export function useReceiveGoods() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (p: GrnPayload) => procurementService.receiveGoods(p),
    onSuccess: invalidate,
  });
}

export function usePurchaseBills() {
  return useQuery({ queryKey: [PROC, 'bills'], queryFn: () => procurementService.listBills() });
}

export function useCreateBill() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (p: BillPayload) => procurementService.createBill(p),
    onSuccess: invalidate,
  });
}

export function usePurchaseReturns() {
  return useQuery({ queryKey: [PROC, 'returns'], queryFn: () => procurementService.listReturns() });
}

export function useCreatePurchaseReturn() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (p: ReturnPayload) => procurementService.createReturn(p),
    onSuccess: invalidate,
  });
}

export function useLandedCosts() {
  return useQuery({
    queryKey: [PROC, 'landed-costs'],
    queryFn: () => procurementService.listLandedCosts(),
  });
}

export function useAddLandedCost() {
  const invalidate = useInvalidateProcurement();
  return useMutation({
    mutationFn: (p: LandedCostPayload) => procurementService.addLandedCost(p),
    onSuccess: invalidate,
  });
}
