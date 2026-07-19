'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  inventoryService,
  type AdjustmentPayload,
  type ReorderRulePayload,
  type SubmitApprovalPayload,
  type TransferPayload,
} from '@/services/inventory.service';

const INV = 'inventory';

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [INV] });
}

export function useBalances(warehouseId?: string) {
  return useQuery({
    queryKey: [INV, 'balances', warehouseId],
    queryFn: () => inventoryService.balances(warehouseId),
  });
}

export function useLedger(filters: { itemId?: string; warehouseId?: string }) {
  return useQuery({
    queryKey: [INV, 'ledger', filters],
    queryFn: () => inventoryService.ledger(filters),
  });
}

export function useTransfers() {
  return useQuery({
    queryKey: [INV, 'transfers'],
    queryFn: () => inventoryService.listTransfers(),
  });
}

export function useCreateTransfer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (p: TransferPayload) => inventoryService.createTransfer(p),
    onSuccess: invalidate,
  });
}

export function useDispatchTransfer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (id: string) => inventoryService.dispatchTransfer(id),
    onSuccess: invalidate,
  });
}

export function useReceiveTransfer() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (id: string) => inventoryService.receiveTransfer(id),
    onSuccess: invalidate,
  });
}

export function useAdjustments() {
  return useQuery({
    queryKey: [INV, 'adjustments'],
    queryFn: () => inventoryService.listAdjustments(),
  });
}

export function useCreateAdjustment() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (p: AdjustmentPayload) => inventoryService.createAdjustment(p),
    onSuccess: invalidate,
  });
}

export function useSubmitAdjustment() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & SubmitApprovalPayload) =>
      inventoryService.submitAdjustment(id, p),
    onSuccess: invalidate,
  });
}

export function useAudits() {
  return useQuery({ queryKey: [INV, 'audits'], queryFn: () => inventoryService.listAudits() });
}

export function useAudit(id: string | undefined) {
  return useQuery({
    queryKey: [INV, 'audits', id],
    queryFn: () => inventoryService.getAudit(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAudit() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (p: { warehouseId: string; notes?: string }) => inventoryService.createAudit(p),
    onSuccess: invalidate,
  });
}

export function useEnterCounts() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({
      id,
      counts,
    }: {
      id: string;
      counts: { lineId: string; countedQty: number }[];
    }) => inventoryService.enterCounts(id, counts),
    onSuccess: invalidate,
  });
}

export function useSubmitAudit() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & SubmitApprovalPayload) =>
      inventoryService.submitAudit(id, p),
    onSuccess: invalidate,
  });
}

export function useReorderRules() {
  return useQuery({
    queryKey: [INV, 'reorder-rules'],
    queryFn: () => inventoryService.listReorderRules(),
  });
}

export function useUpsertReorderRule() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (p: ReorderRulePayload) => inventoryService.upsertReorderRule(p),
    onSuccess: invalidate,
  });
}

export function useReorderSuggestions() {
  return useQuery({
    queryKey: [INV, 'reorder-suggestions'],
    queryFn: () => inventoryService.reorderSuggestions(),
  });
}
