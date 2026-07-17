import { apiClient } from './api-client';

/** The one owner-specific auth call the shared authService can't cover: self-service email reset, since owners (unlike synthetic-email tenant users) have a real inbox. */
export const ownerAuthService = {
  requestPasswordReset: (email: string) =>
    apiClient.post<void>('/owner/auth/reset-password', { email }),
};
