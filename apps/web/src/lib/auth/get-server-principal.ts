import type { Principal } from '@inventory-mgmt/shared-types';

import { createClient } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Server-side principal resolution for layout-level route protection.
 * Runs in the Node.js serverless runtime (RSC layouts), not the Edge
 * runtime, sidestepping the platform bug that took middleware.ts out.
 * Redirects happen before anything renders, unlike the client-side
 * AuthGuard, which is a reactive backstop for mid-session expiry only.
 */
export async function getServerPrincipal(): Promise<Principal | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { data?: { principal?: Principal } };
  return json.data?.principal ?? null;
}
