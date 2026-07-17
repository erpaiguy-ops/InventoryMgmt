'use client';

import type { PurchaseOrder, PurchaseOrderStatus } from '@inventory-mgmt/shared-types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePurchaseOrders } from '@/hooks/use-orders';
import { useSuppliers } from '@/hooks/use-suppliers';
import { formatCurrency, formatDate } from '@/utils/format';

const PAGE_SIZE = 20;
const ALL_STATUSES = '__all__';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePurchaseOrders({
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: suppliersData } = useSuppliers({ pageSize: 100 });
  const supplierById = new Map((suppliersData?.data ?? []).map((s) => [s.id, s.name]));

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'PO Number' },
    {
      key: 'supplierId',
      header: 'Supplier',
      render: (po) => (po.supplierId ? (supplierById.get(po.supplierId) ?? '—') : '—'),
    },
    { key: 'orderDate', header: 'Order date', render: (po) => formatDate(po.orderDate) },
    { key: 'status', header: 'Status', render: (po) => <OrderStatusBadge status={po.status} /> },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (po) => (po.totalAmount != null ? formatCurrency(po.totalAmount) : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <Button asChild>
          <Link href="/dashboard/purchase-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Link>
        </Button>
      </div>

      <Select
        value={status || ALL_STATUSES}
        onValueChange={(value) => {
          setStatus(value === ALL_STATUSES ? '' : (value as PurchaseOrderStatus));
          setPage(1);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="received">Received</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No purchase orders yet."
        onRowClick={(po) => router.push(`/dashboard/purchase-orders/${po.id}`)}
        pagination={
          data
            ? {
                page: data.meta.page,
                pageSize: data.meta.pageSize,
                totalItems: data.meta.totalItems,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
