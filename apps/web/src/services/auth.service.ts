import type { Principal } from '@inventory-mgmt/shared-types';

import { createClient } from '@/lib/supabase/client';

import { apiClient } from './api-client';

export interface MeResponse {
  id: string;
  emailConfirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  principal: Principal;
}

export interface UpdateProfilePayload {
  fullName?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Shared by both the tenant app and the owner console — /auth/me, /auth/profile, /auth/change-password, and /auth/logout are all principal-agnostic on the backend. */
export const authService = {
  getMe: () => apiClient.get<MeResponse>('/auth/me'),
  updateProfile: (payload: UpdateProfilePayload) => apiClient.put<void>('/auth/profile', payload),
  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post<void>('/auth/change-password', payload),
  async signOut(): Promise<void> {
    await apiClient.post<void>('/auth/logout').catch(() => undefined);
    await createClient().auth.signOut();
  },
};
