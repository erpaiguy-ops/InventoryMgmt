'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useRealtimeSubscription } from '@/hooks/use-realtime';
import type {
  AdjustStockPayload,
  ListMovementsParams,
  UpdateStockPayload,
} from '@/services/inventory.service';
import { inventoryService } from '@/services/inventory.service';
import { productsService } from '@/services/products.service';

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

interface InventoryRow {
  id: string;
  product_id: string;
  quantity: number;
}

const notifiedLowStock = new Set<string>();

/**
 * Live-updates cached inventory/product queries as stock changes, and warns
 * once per product per session when a change drops it at or below its
 * reorder level. Mount once near the root of the authenticated app.
 */
export function useLowStockRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  const handleChange = useCallback(
    (payload: { eventType: string; new: Partial<InventoryRow> }) => {
      if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;

      invalidateStock(queryClient);

      const productId = payload.new.product_id;
      const quantity = payload.new.quantity;
      if (!productId || quantity === undefined) return;

      void productsService.get(productId).then((product) => {
        if (quantity > product.reorderLevel) {
          notifiedLowStock.delete(productId);
          return;
        }

        if (notifiedLowStock.has(productId)) return;
        notifiedLowStock.add(productId);

        toast.warning(`Low stock: ${product.name} (${quantity} left)`, {
          duration: 10000,
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = '/dashboard/inventory';
            },
          },
        });
      });
    },
    [queryClient],
  );

  useRealtimeSubscription<InventoryRow>('inventory', handleChange, enabled);
}
