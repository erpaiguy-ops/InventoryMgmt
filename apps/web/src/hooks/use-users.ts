'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersService, type CreateUserPayload } from '@/services/users.service';

const USERS_KEY = 'users';
const ROLES_KEY = 'roles';

export function useUsers() {
  return useQuery({
    queryKey: [USERS_KEY],
    queryFn: () => usersService.list(),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: [ROLES_KEY],
    queryFn: () => usersService.listRoles(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
      usersService.updateRole(id, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      usersService.resetPassword(id, newPassword),
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
