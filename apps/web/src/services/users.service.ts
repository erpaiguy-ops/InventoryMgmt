import type { Profile, ProfileRole } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface ActivityLogEntry {
  type: 'stock_movement' | 'purchase_order' | 'sales_order';
  id: string;
  description: string;
  createdAt: string;
}

export const usersService = {
  list: () => apiClient.get<Profile[]>('/users'),
  get: (id: string) => apiClient.get<Profile>(`/users/${id}`),
  invite: (email: string, role?: ProfileRole) =>
    apiClient.post<{ userId: string; email: string }>('/users/invite', { email, role }),
  updateRole: (id: string, role: ProfileRole) =>
    apiClient.put<Profile>(`/users/${id}/role`, { role }),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
  getActivity: (id: string) => apiClient.get<ActivityLogEntry[]>(`/users/${id}/activity`),
};
