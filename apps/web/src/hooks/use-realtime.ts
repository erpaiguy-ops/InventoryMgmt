'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { createClient } from '@/lib/supabase/client';

type TableName = 'inventory' | 'notifications' | 'products' | 'sales_orders' | 'purchase_orders';

export function useRealtimeSubscription<T extends object>(
  table: TableName,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled = true,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        // v2 schema: this app's tables live in `v2`, not `public` (v1's schema).
        // RLS still governs which rows a given client actually receives.
        { event: '*', schema: 'v2', table },
        (payload: RealtimePostgresChangesPayload<T>) => onEventRef.current(payload),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, enabled]);
}
