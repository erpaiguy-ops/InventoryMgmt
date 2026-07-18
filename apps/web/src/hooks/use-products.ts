'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ListProductsParams, ProductPayload } from '@/services/products.service';
import { productsService } from '@/services/products.service';

const PRODUCTS_KEY = 'products';

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => productsService.list(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => productsService.get(id!),
    enabled: Boolean(id),
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'categories'],
    queryFn: () => productsService.getCategories(),
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'low-stock'],
    queryFn: () => productsService.getLowStock(),
  });
}

export function useStockValue() {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'stock-value'],
    queryFn: () => productsService.getStockValue(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductPayload) => productsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductPayload> }) =>
      productsService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}
