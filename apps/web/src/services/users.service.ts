import { apiClient } from './api-client';

export interface TenantUser {
  id: string;
  username: string;
  fullName: string | null;
  roleId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantRole {
  id: string;
  slug: string;
  name: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  roleId: string;
}

export const usersService = {
  list: () => apiClient.get<TenantUser[]>('/users'),
  listRoles: () => apiClient.get<TenantRole[]>('/users/roles'),
  get: (id: string) => apiClient.get<TenantUser>(`/users/${id}`),
  create: (payload: CreateUserPayload) => apiClient.post<TenantUser>('/users', payload),
  updateRole: (id: string, roleId: string) =>
    apiClient.put<TenantUser>(`/users/${id}/role`, { roleId }),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.put<void>(`/users/${id}/reset-password`, { newPassword }),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
};
