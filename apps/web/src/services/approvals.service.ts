import type { ApprovalRequest, ReasonCode } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export const approvalsService = {
  inbox: () => apiClient.get<ApprovalRequest[]>('/approvals/inbox'),
  history: () => apiClient.get<ApprovalRequest[]>('/approvals/history'),
  act: (id: string, decision: 'approve' | 'reject', comment?: string) =>
    apiClient.post<ApprovalRequest>(`/approvals/${id}/act`, { decision, comment }),
  reasonCodes: (docType?: string) =>
    apiClient.get<ReasonCode[]>(
      `/approvals/reason-codes${docType ? `?docType=${encodeURIComponent(docType)}` : ''}`,
    ),
};
