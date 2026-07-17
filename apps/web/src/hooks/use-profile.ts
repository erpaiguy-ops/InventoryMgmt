'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth.service';

export function useProfile() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const query = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile(),
    enabled: Boolean(user),
  });

  return {
    profile: query.data,
    isLoading: isAuthLoading || (Boolean(user) && query.isLoading),
    isError: query.isError,
  };
}
