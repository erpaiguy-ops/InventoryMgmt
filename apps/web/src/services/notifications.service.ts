import type { Notification } from '@inventory-mgmt/shared-types';

import { createClient } from '@/lib/supabase/client';

function toNotification(row: {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  metadata: unknown;
  created_at: string;
}): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type as Notification['type'],
    readAt: row.read_at,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at,
  };
}

export const notificationsService = {
  async list(limit = 20): Promise<Notification[]> {
    const { data, error } = await createClient()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map(toNotification);
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await createClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await createClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;
  },
};
