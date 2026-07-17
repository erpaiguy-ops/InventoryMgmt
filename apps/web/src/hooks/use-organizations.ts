'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  organizationsService,
  type BootstrapAdminPayload,
  type CreateOrganizationPayload,
} from '@/services/organizations.service';

const ORGANIZATIONS_KEY = ['organizations'];

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: () => organizationsService.list(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrganizationPayload) => organizationsService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
    },
  });
}

export function useBootstrapAdmin() {
  return useMutation({
    mutationFn: ({ id, ...payload }: BootstrapAdminPayload & { id: string }) =>
      organizationsService.bootstrapAdmin(id, payload),
  });
}

export function useSetOrganizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      status === 'suspended' ? organizationsService.suspend(id) : organizationsService.activate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
    },
  });
}
