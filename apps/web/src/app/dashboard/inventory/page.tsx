'use client';

import { AlertTriangle, Layers, Package, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { SearchBar } from '@/components/common/search-bar';
import { LowStockAlert } from '@/components/inventory/low-stock-alert';
import { StockAdjustmentForm } from '@/components/inventory/stock-adjustment-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLowStockInventory } from '@/hooks/use-inventory';
import { useProducts, useStockValue } from '@/hooks/use-products';
import type { ProductWithInventory } from '@/services/products.service';
import { formatCurrency } from '@/utils/format';

const PAGE_SIZE = 20;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  tone?: 'destructive';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${tone === 'destructive' ? 'text-destructive' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProducts({ search, page, pageSize: PAGE_SIZE });
  const { data: stockValue } = useStockValue();
  const { data: lowStock = [] } = useLowStockInventory();

  const columns: DataTableColumn<ProductWithInventory>[] = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Product' },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (p) => {
        const quantity = p.inventory?.quantity ?? 0;
        const isLow = quantity <= p.reorderLevel;
        return (
          <span className="flex items-center gap-2">
            {quantity}
            {isLow ? <Badge variant="warning">Low</Badge> : null}
          </span>
        );
      },
    },
    { key: 'reorderLevel', header: 'Reorder level' },
    {
      key: 'location',
      header: 'Location',
      render: (p) => p.inventory?.warehouseLocation ?? '—',
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-3">
          <StockAdjustmentForm productId={p.id} productName={p.name} />
          <Link
            href={`/dashboard/inventory/movements?productId=${p.id}`}
            className="text-primary text-sm hover:underline"
          >
            History
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Track and manage your stock levels</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/inventory/movements">All movements</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={data?.meta.totalItems ?? 0} icon={Package} />
        <StatCard label="Units in stock" value={stockValue?.totalUnits ?? 0} icon={Layers} />
        <StatCard
          label="Retail value"
          value={formatCurrency(stockValue?.totalRetailValue ?? 0)}
          icon={Wallet}
        />
        <StatCard
          label="Low stock items"
          value={lowStock.length}
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'destructive' : undefined}
        />
      </div>

      <LowStockAlert />

      <SearchBar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Search by name or SKU..."
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No products yet."
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
