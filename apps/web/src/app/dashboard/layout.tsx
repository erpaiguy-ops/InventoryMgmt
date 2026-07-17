import { redirect } from 'next/navigation';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { getServerPrincipal } from '@/lib/auth/get-server-principal';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const principal = await getServerPrincipal();

  if (!principal) {
    redirect('/login');
  }

  if (principal.type !== 'tenant') {
    redirect('/owner');
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="bg-muted/40 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
