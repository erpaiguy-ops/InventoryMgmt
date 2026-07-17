import { redirect } from 'next/navigation';

import { AuthGuard } from '@/components/auth/auth-guard';
import { OwnerHeader } from '@/components/layout/owner-header';
import { OwnerSidebar } from '@/components/layout/owner-sidebar';
import { getServerPrincipal } from '@/lib/auth/get-server-principal';

export default async function OwnerConsoleLayout({ children }: { children: React.ReactNode }) {
  const principal = await getServerPrincipal();

  if (!principal) {
    redirect('/owner/login');
  }

  if (principal.type !== 'owner') {
    redirect('/dashboard');
  }

  return (
    <AuthGuard redirectTo="/owner/login">
      <div className="flex h-screen overflow-hidden">
        <OwnerSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <OwnerHeader />
          <main className="bg-muted/40 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
