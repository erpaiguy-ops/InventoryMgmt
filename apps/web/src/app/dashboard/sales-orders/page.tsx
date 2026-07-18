'use client';

import { SalesOrderStatus, type SalesOrder } from '@inventory-mgmt/shared-types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmSalesOrder, useSalesOrders, useSalesOrderStats } from '@/hooks/use-orders';
import { ApiError } from '@/services/api-client';
import { formatCurrency, formatDate } from '@/utils/format';

const PAGE_SIZE = 20;
const ALL_STATUSES = '__all__';

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className={`text-2xl font-bold ${tone ?? ''}`}>{value}</CardContent>
    </Card>
  );
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SalesOrderStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSalesOrders({
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: stats } = useSalesOrderStats();
  const confirmOrder = useConfirmSalesOrder();

  const columns: DataTableColumn<SalesOrder>[] = [
    { key: 'orderNumber', header: 'Order Number' },
    { key: 'customerName', header: 'Customer' },
    { key: 'orderDate', header: 'Order date', render: (so) => formatDate(so.orderDate) },
    { key: 'status', header: 'Status', render: (so) => <OrderStatusBadge status={so.status} /> },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (so) => (so.totalAmount != null ? formatCurrency(so.totalAmount) : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (so) =>
        so.status === SalesOrderStatus.DRAFT ? (
          <Button
            size="sm"
            disabled={confirmOrder.isPending}
            onClick={(event) => {
              event.stopPropagation();
              confirmOrder.mutate(so.id, {
                onSuccess: () => toast.success('Order confirmed'),
                onError: (error) => {
                  toast.error(
                    error instanceof ApiError ? error.message : 'Failed to confirm order',
                  );
                },
              });
            }}
          >
            Confirm
          </Button>
        ) : null,
    },
  ];

  const byStatus = stats?.byStatus ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales Orders</h1>
        <Button asChild>
          <Link href="/dashboard/sales-orders/create">
            <Plus className="mr-2 h-4 w-4" />
            New Sales Order
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={stats?.totalOrders ?? 0} />
        <StatCard label="Confirmed" value={byStatus.confirmed ?? 0} tone="text-blue-600" />
        <StatCard label="Delivered" value={byStatus.delivered ?? 0} tone="text-emerald-600" />
        <StatCard label="Cancelled" value={byStatus.cancelled ?? 0} tone="text-destructive" />
      </div>

      <Select
        value={status || ALL_STATUSES}
        onValueChange={(value) => {
          setStatus(value === ALL_STATUSES ? '' : (value as SalesOrderStatus));
          setPage(1);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="shipped">Shipped</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No sales orders yet."
        onRowClick={(so) => router.push(`/dashboard/sales-orders/${so.id}`)}
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
