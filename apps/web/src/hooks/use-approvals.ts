'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { approvalsService } from '@/services/approvals.service';

const APPROVALS = 'approvals';

export function useApprovalInbox() {
  return useQuery({
    queryKey: [APPROVALS, 'inbox'],
    queryFn: () => approvalsService.inbox(),
  });
}

export function useApprovalHistory() {
  return useQuery({
    queryKey: [APPROVALS, 'history'],
    queryFn: () => approvalsService.history(),
  });
}

export function useReasonCodes(docType?: string) {
  return useQuery({
    queryKey: [APPROVALS, 'reason-codes', docType],
    queryFn: () => approvalsService.reasonCodes(docType),
  });
}

export function useActOnApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: 'approve' | 'reject';
      comment?: string;
    }) => approvalsService.act(id, decision, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [APPROVALS] });
      // Acting on an approval can post stock — refresh inventory views too.
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
