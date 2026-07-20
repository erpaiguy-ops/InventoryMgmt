'use client';

import { type AgingRow } from '@inventory-mgmt/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApAging, useArAging } from '@/hooks/use-financials';

const BUCKET_VARIANT: Record<
  AgingRow['bucket'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  current: 'default',
  '1-30': 'secondary',
  '31-60': 'outline',
  '61-90': 'outline',
  '90+': 'destructive',
};

function AgingTable({
  rows,
  isLoading,
  partnerLabel,
}: {
  rows: AgingRow[];
  isLoading: boolean;
  partnerLabel: string;
}) {
  const columns: DataTableColumn<AgingRow>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (r) => <span className="font-mono text-xs">{r.docNo}</span>,
    },
    { key: 'partner', header: partnerLabel, render: (r) => r.partnerName ?? r.partnerId },
    { key: 'due', header: 'Due date', render: (r) => r.dueDate ?? '—' },
    { key: 'total', header: 'Total', render: (r) => Number(r.total).toFixed(2) },
    { key: 'paid', header: 'Paid', render: (r) => Number(r.amountPaid).toFixed(2) },
    { key: 'balance', header: 'Balance', render: (r) => Number(r.balance).toFixed(2) },
    {
      key: 'bucket',
      header: 'Aging',
      render: (r) => <Badge variant={BUCKET_VARIANT[r.bucket]}>{r.bucket}</Badge>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows.map((r) => ({ ...r, id: r.docId }))}
      loading={isLoading}
      emptyMessage="Nothing outstanding"
    />
  );
}

export default function AgingPage() {
  const { data: arRows, isLoading: arLoading } = useArAging();
  const { data: apRows, isLoading: apLoading } = useApAging();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" asChild>
          <Link href="/dashboard/financials">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Aging</h1>
      </div>
      <Tabs defaultValue="ar">
        <TabsList>
          <TabsTrigger value="ar">Receivables</TabsTrigger>
          <TabsTrigger value="ap">Payables</TabsTrigger>
        </TabsList>
        <TabsContent value="ar" className="mt-4">
          <AgingTable rows={arRows ?? []} isLoading={arLoading} partnerLabel="Customer" />
        </TabsContent>
        <TabsContent value="ap" className="mt-4">
          <AgingTable rows={apRows ?? []} isLoading={apLoading} partnerLabel="Supplier" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
