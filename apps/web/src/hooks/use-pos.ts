'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  posService,
  type CreatePosSalePayload,
  type OpenSessionPayload,
} from '@/services/pos.service';

const POS = 'pos';

function useInvalidatePos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [POS] });
    void queryClient.invalidateQueries({ queryKey: ['financials'] });
  };
}

export function useCashDrawerSessions() {
  return useQuery({ queryKey: [POS, 'sessions'], queryFn: () => posService.listSessions() });
}

export function useOpenCashDrawerSession() {
  const invalidate = useInvalidatePos();
  return useMutation({
    mutationFn: (p: OpenSessionPayload) => posService.openSession(p),
    onSuccess: invalidate,
  });
}

export function useCloseCashDrawerSession() {
  const invalidate = useInvalidatePos();
  return useMutation({
    mutationFn: ({ id, countedAmount }: { id: string; countedAmount: number }) =>
      posService.closeSession(id, { countedAmount }),
    onSuccess: invalidate,
  });
}

export function usePosSales(sessionId?: string) {
  return useQuery({
    queryKey: [POS, 'sales', sessionId],
    queryFn: () => posService.listSales(sessionId),
  });
}

export function useCreatePosSale() {
  const invalidate = useInvalidatePos();
  return useMutation({
    mutationFn: (p: CreatePosSalePayload) => posService.createSale(p),
    onSuccess: invalidate,
  });
}
