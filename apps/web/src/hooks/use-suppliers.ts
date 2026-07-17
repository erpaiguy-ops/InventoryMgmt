'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ListSuppliersParams, SupplierPayload } from '@/services/suppliers.service';
import { suppliersService } from '@/services/suppliers.service';

const SUPPLIERS_KEY = 'suppliers';

export function useSuppliers(params: ListSuppliersParams = {}) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, params],
    queryFn: () => suppliersService.list(params),
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, id],
    queryFn: () => suppliersService.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierPayload) => suppliersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupplierPayload> }) =>
      suppliersService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
}
