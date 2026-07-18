'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreatePurchaseOrderPayload,
  ListPurchaseOrdersParams,
  ReceivePurchaseOrderPayload,
} from '@/services/purchase-orders.service';
import { purchaseOrdersService } from '@/services/purchase-orders.service';
import type {
  CreateSalesOrderPayload,
  ListSalesOrdersParams,
} from '@/services/sales-orders.service';
import { salesOrdersService } from '@/services/sales-orders.service';

const PO_KEY = 'purchase-orders';
const SO_KEY = 'sales-orders';
const INVENTORY_KEY = 'inventory';
const PRODUCTS_KEY = 'products';

// -- Purchase orders ----------------------------------------------------------

export function usePurchaseOrders(params: ListPurchaseOrdersParams = {}) {
  return useQuery({
    queryKey: [PO_KEY, params],
    queryFn: () => purchaseOrdersService.list(params),
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [PO_KEY, id],
    queryFn: () => purchaseOrdersService.get(id!),
    enabled: Boolean(id),
  });
}

export function usePurchaseOrderStats() {
  return useQuery({
    queryKey: [PO_KEY, 'stats'],
    queryFn: () => purchaseOrdersService.getStats(),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => purchaseOrdersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PO_KEY] });
    },
  });
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'pending' | 'cancelled' }) =>
      purchaseOrdersService.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PO_KEY] });
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReceivePurchaseOrderPayload }) =>
      purchaseOrdersService.receive(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PO_KEY] });
      void queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useDeletePurchaseOrderDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersService.deleteDraft(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PO_KEY] });
    },
  });
}

// -- Sales orders ---------------------------------------------------------------

export function useSalesOrders(params: ListSalesOrdersParams = {}) {
  return useQuery({
    queryKey: [SO_KEY, params],
    queryFn: () => salesOrdersService.list(params),
  });
}

export function useSalesOrder(id: string | undefined) {
  return useQuery({
    queryKey: [SO_KEY, id],
    queryFn: () => salesOrdersService.get(id!),
    enabled: Boolean(id),
  });
}

export function useSalesOrderStats() {
  return useQuery({
    queryKey: [SO_KEY, 'stats'],
    queryFn: () => salesOrdersService.getStats(),
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => salesOrdersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SO_KEY] });
    },
  });
}

function invalidateSalesOrderAndStock(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: [SO_KEY] });
  void queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrdersService.confirm(id),
    onSuccess: () => invalidateSalesOrderAndStock(queryClient),
  });
}

export function useShipSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrdersService.ship(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SO_KEY] });
    },
  });
}

export function useDeliverSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrdersService.deliver(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SO_KEY] });
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesOrdersService.cancel(id),
    onSuccess: () => invalidateSalesOrderAndStock(queryClient),
  });
}

export function useDeleteSalesOrderDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesOrdersService.deleteDraft(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SO_KEY] });
    },
  });
}
