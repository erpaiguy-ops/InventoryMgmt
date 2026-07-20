'use client';

import { type SalesInvoice } from '@inventory-mgmt/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSalesInvoices } from '@/hooks/use-sales';

const STATUS_VARIANT: Record<SalesInvoice['status'], 'default' | 'secondary' | 'outline'> = {
  open: 'outline',
  paid: 'default',
  cancelled: 'secondary',
};

export default function SalesInvoicesPage() {
  const { data: invoices, isLoading } = useSalesInvoices();

  const columns: DataTableColumn<SalesInvoice>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (invoice) => <span className="font-mono text-xs">{invoice.docNo}</span>,
    },
    {
      key: 'so',
      header: 'SO',
      render: (invoice) => <span className="font-mono text-xs">{invoice.soDocNo ?? '—'}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice) => invoice.customerName ?? invoice.customerId,
    },
    { key: 'date', header: 'Invoice date', render: (invoice) => invoice.invoiceDate },
    { key: 'due', header: 'Due', render: (invoice) => invoice.dueDate ?? '—' },
    { key: 'total', header: 'Total', render: (invoice) => Number(invoice.total).toFixed(2) },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => <Badge variant={STATUS_VARIANT[invoice.status]}>{invoice.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" asChild>
          <Link href="/dashboard/sales">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Sales invoices</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Invoices are created from a sales order&apos;s detail page, matched against delivered
        quantities.
      </p>
      <DataTable
        columns={columns}
        data={invoices ?? []}
        loading={isLoading}
        emptyMessage="No invoices created yet"
      />
    </div>
  );
}
