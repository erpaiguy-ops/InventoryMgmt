'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  partnersService,
  type ListPartnersParams,
  type PartnerPayload,
} from '@/services/partners.service';

const PARTNERS = 'partners';
const PAYMENT_TERMS = ['partners', 'payment-terms'] as const;
const GROUPS = ['partners', 'groups'] as const;

export function usePartners(params: ListPartnersParams) {
  return useQuery({
    queryKey: [PARTNERS, params],
    queryFn: () => partnersService.list(params),
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: [PARTNERS, 'detail', id],
    queryFn: () => partnersService.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: PartnerPayload) => partnersService.create(p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function useBulkCreatePartners() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partners: PartnerPayload[]) => partnersService.bulkCreate(partners),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<PartnerPayload>) =>
      partnersService.update(id, p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partnersService.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function usePaymentTerms() {
  return useQuery({ queryKey: PAYMENT_TERMS, queryFn: () => partnersService.listPaymentTerms() });
}

export function usePartnerGroups() {
  return useQuery({ queryKey: GROUPS, queryFn: () => partnersService.listGroups() });
}
