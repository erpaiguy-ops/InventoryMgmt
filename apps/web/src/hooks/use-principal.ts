'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth.service';

export function usePrincipal() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
    enabled: Boolean(user),
  });

  return {
    principal: query.data?.principal,
    me: query.data,
    isLoading: isAuthLoading || (Boolean(user) && query.isLoading),
    isError: query.isError,
  };
}
