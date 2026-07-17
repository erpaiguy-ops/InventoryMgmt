import type { Organization } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
}

export interface BootstrapAdminPayload {
  username: string;
  password: string;
  fullName: string;
}

export const organizationsService = {
  list: () => apiClient.get<Organization[]>('/owner/organizations'),
  get: (id: string) => apiClient.get<Organization>(`/owner/organizations/${id}`),
  create: (payload: CreateOrganizationPayload) =>
    apiClient.post<Organization>('/owner/organizations', payload),
  suspend: (id: string) => apiClient.put<Organization>(`/owner/organizations/${id}/suspend`),
  activate: (id: string) => apiClient.put<Organization>(`/owner/organizations/${id}/activate`),
  bootstrapAdmin: (id: string, payload: BootstrapAdminPayload) =>
    apiClient.post<{ id: string; username: string }>(
      `/owner/organizations/${id}/bootstrap-admin`,
      payload,
    ),
};
