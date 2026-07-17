'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AdjustStockPayload,
  ListMovementsParams,
  UpdateStockPayload,
} from '@/services/inventory.service';
import { inventoryService } from '@/services/inventory.service';

const INVENTORY_KEY = 'inventory';
const PRODUCTS_KEY = 'products';

export function useInventory() {
  return useQuery({
    queryKey: [INVENTORY_KEY],
    queryFn: () => inventoryService.getAll(),
  });
}

export function useLowStockInventory() {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'low-stock'],
    queryFn: () => inventoryService.getLowStock(),
  });
}

export function useStockMovements(productId: string | undefined, params: ListMovementsParams = {}) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'movements', productId, params],
    queryFn: () => inventoryService.getMovements(productId!, params),
    enabled: Boolean(productId),
  });
}

function invalidateStock(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: UpdateStockPayload }) =>
      inventoryService.updateStock(productId, payload),
    onSuccess: () => invalidateStock(queryClient),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => inventoryService.adjustStock(payload),
    onSuccess: () => invalidateStock(queryClient),
  });
}
