import type { Profile } from '@inventory-mgmt/shared-types';

import { createClient } from '@/lib/supabase/client';

import { apiClient } from './api-client';

export interface UpdateProfilePayload {
  fullName?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  getProfile: () => apiClient.get<Profile>('/auth/profile'),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.put<Profile>('/auth/profile', payload),
  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post<void>('/auth/change-password', payload),
  requestPasswordReset: (email: string) => apiClient.post<void>('/auth/reset-password', { email }),
  async signOut(): Promise<void> {
    await apiClient.post<void>('/auth/logout').catch(() => undefined);
    await createClient().auth.signOut();
  },
};
