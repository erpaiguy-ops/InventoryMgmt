'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Where to send an unauthenticated user. The tenant app and owner console use different login pages, so this isn't hardcoded. */
  redirectTo?: string;
}

/**
 * Reactive client-side layer for mid-session token expiry (a tab left open
 * past session expiry). The primary gate is the server-side principal check
 * in dashboard/layout.tsx and owner/layout.tsx, which redirects before
 * anything renders — this component is a backstop, not the main boundary.
 */
export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
