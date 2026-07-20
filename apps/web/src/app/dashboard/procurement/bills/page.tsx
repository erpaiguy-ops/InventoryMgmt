'use client';

import { type PurchaseBill } from '@inventory-mgmt/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePurchaseBills } from '@/hooks/use-procurement';

const STATUS_VARIANT: Record<PurchaseBill['status'], 'default' | 'secondary' | 'outline'> = {
  open: 'outline',
  paid: 'default',
  cancelled: 'secondary',
};

export default function PurchaseBillsPage() {
  const { data: bills, isLoading } = usePurchaseBills();

  const columns: DataTableColumn<PurchaseBill>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (bill) => <span className="font-mono text-xs">{bill.docNo}</span>,
    },
    {
      key: 'po',
      header: 'PO',
      render: (bill) => <span className="font-mono text-xs">{bill.poDocNo ?? '—'}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (bill) => bill.supplierName ?? bill.supplierId,
    },
    {
      key: 'billNo',
      header: 'Supplier bill no',
      render: (bill) => bill.supplierBillNo ?? '—',
    },
    { key: 'date', header: 'Bill date', render: (bill) => bill.billDate },
    { key: 'due', header: 'Due', render: (bill) => bill.dueDate ?? '—' },
    { key: 'total', header: 'Total', render: (bill) => Number(bill.total).toFixed(2) },
    {
      key: 'status',
      header: 'Status',
      render: (bill) => <Badge variant={STATUS_VARIANT[bill.status]}>{bill.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" asChild>
          <Link href="/dashboard/procurement">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Purchase bills</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Bills are recorded from a purchase order&apos;s detail page, three-way matched against
        received quantities.
      </p>
      <DataTable
        columns={columns}
        data={bills ?? []}
        loading={isLoading}
        emptyMessage="No bills recorded yet"
      />
    </div>
  );
}
