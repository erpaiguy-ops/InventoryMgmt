'use client';

import Link from 'next/link';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizations } from '@/hooks/use-organizations';

export default function OwnerOverviewPage() {
  const { data: organizations, isLoading } = useOrganizations();

  const activeCount = organizations?.filter((org) => org.status === 'active').length ?? 0;
  const suspendedCount = organizations?.filter((org) => org.status === 'suspended').length ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total organizations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {organizations?.length ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{activeCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Suspended</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{suspendedCount}</CardContent>
          </Card>
        </div>
      )}

      <Button asChild>
        <Link href="/owner/organizations">Manage organizations</Link>
      </Button>
    </div>
  );
}
