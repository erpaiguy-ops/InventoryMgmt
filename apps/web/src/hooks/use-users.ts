'use client';

import type { ProfileRole } from '@inventory-mgmt/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersService } from '@/services/users.service';

const USERS_KEY = 'users';

export function useUsers() {
  return useQuery({
    queryKey: [USERS_KEY],
    queryFn: () => usersService.list(),
  });
}

export function useUserActivity(id: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, id, 'activity'],
    queryFn: () => usersService.getActivity(id!),
    enabled: Boolean(id),
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: ProfileRole }) =>
      usersService.invite(email, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: ProfileRole }) =>
      usersService.updateRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}
