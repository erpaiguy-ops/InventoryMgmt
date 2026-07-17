'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { notificationsService } from '@/services/notifications.service';

const NOTIFICATIONS_KEY = 'notifications';

export function useNotifications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: () => notificationsService.list(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const queryClient = useQueryClient();
  const handleChange = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
  }, [queryClient]);

  useRealtimeSubscription('notifications', handleChange, Boolean(user));

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.markAllAsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
