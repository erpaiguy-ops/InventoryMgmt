'use client';

import type { PaginationParams, Product } from '@inventory-mgmt/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { productsService } from '@/services/products.service';

const PRODUCTS_KEY = 'products';

export function useProducts(params: PaginationParams = {}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => productsService.list(params),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Product>) => productsService.create(payload),
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
