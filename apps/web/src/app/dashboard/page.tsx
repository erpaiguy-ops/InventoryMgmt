'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrincipal } from '@/hooks/use-principal';

export default function DashboardPage() {
  const { principal } = usePrincipal();
  const fullName = principal?.type === 'tenant' ? principal.fullName : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{fullName ? `, ${fullName}` : ''}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This is the foundation release — modules like Procurement, Inventory, and Accounts are
          rolled out from here as they land. Manage your team under Users in the sidebar.
        </CardContent>
      </Card>
    </div>
  );
}
