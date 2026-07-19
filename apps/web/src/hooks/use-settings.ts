'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  settingsService,
  type NumberingSeriesPayload,
  type OrgSettingsPayload,
  type TaxPayload,
  type UomPayload,
  type WarehousePayload,
} from '@/services/settings.service';

const KEYS = {
  taxes: ['settings', 'taxes'] as const,
  uoms: ['settings', 'uoms'] as const,
  warehouses: ['settings', 'warehouses'] as const,
  numbering: ['settings', 'numbering'] as const,
  org: ['settings', 'org'] as const,
};

export function useTaxes() {
  return useQuery({ queryKey: KEYS.taxes, queryFn: () => settingsService.listTaxes() });
}
export function useUoms() {
  return useQuery({ queryKey: KEYS.uoms, queryFn: () => settingsService.listUoms() });
}
export function useWarehouses() {
  return useQuery({ queryKey: KEYS.warehouses, queryFn: () => settingsService.listWarehouses() });
}
export function useNumberingSeries() {
  return useQuery({
    queryKey: KEYS.numbering,
    queryFn: () => settingsService.listNumberingSeries(),
  });
}
export function useOrgSettings() {
  return useQuery({ queryKey: KEYS.org, queryFn: () => settingsService.getOrgSettings() });
}

function useInvalidate(key: readonly string[]) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: key });
}

export function useCreateTax() {
  const invalidate = useInvalidate(KEYS.taxes);
  return useMutation({
    mutationFn: (p: TaxPayload) => settingsService.createTax(p),
    onSuccess: invalidate,
  });
}
export function useUpdateTax() {
  const invalidate = useInvalidate(KEYS.taxes);
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<TaxPayload>) =>
      settingsService.updateTax(id, p),
    onSuccess: invalidate,
  });
}
export function useDeleteTax() {
  const invalidate = useInvalidate(KEYS.taxes);
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteTax(id),
    onSuccess: invalidate,
  });
}

export function useCreateUom() {
  const invalidate = useInvalidate(KEYS.uoms);
  return useMutation({
    mutationFn: (p: UomPayload) => settingsService.createUom(p),
    onSuccess: invalidate,
  });
}
export function useDeleteUom() {
  const invalidate = useInvalidate(KEYS.uoms);
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteUom(id),
    onSuccess: invalidate,
  });
}

export function useCreateWarehouse() {
  const invalidate = useInvalidate(KEYS.warehouses);
  return useMutation({
    mutationFn: (p: WarehousePayload) => settingsService.createWarehouse(p),
    onSuccess: invalidate,
  });
}
export function useUpdateWarehouse() {
  const invalidate = useInvalidate(KEYS.warehouses);
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<WarehousePayload>) =>
      settingsService.updateWarehouse(id, p),
    onSuccess: invalidate,
  });
}
export function useDeleteWarehouse() {
  const invalidate = useInvalidate(KEYS.warehouses);
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteWarehouse(id),
    onSuccess: invalidate,
  });
}

export function useCreateNumberingSeries() {
  const invalidate = useInvalidate(KEYS.numbering);
  return useMutation({
    mutationFn: (p: NumberingSeriesPayload) => settingsService.createNumberingSeries(p),
    onSuccess: invalidate,
  });
}
export function useUpdateNumberingSeries() {
  const invalidate = useInvalidate(KEYS.numbering);
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<Omit<NumberingSeriesPayload, 'docType'>>) =>
      settingsService.updateNumberingSeries(id, p),
    onSuccess: invalidate,
  });
}

export function useUpdateOrgSettings() {
  const invalidate = useInvalidate(KEYS.org);
  return useMutation({
    mutationFn: (p: OrgSettingsPayload) => settingsService.updateOrgSettings(p),
    onSuccess: invalidate,
  });
}
