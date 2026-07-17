'use client';

import Link from 'next/link';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { SearchBar } from '@/components/common/search-bar';
import { LowStockAlert } from '@/components/inventory/low-stock-alert';
import { StockAdjustmentForm } from '@/components/inventory/stock-adjustment-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/use-products';
import type { ProductWithInventory } from '@/services/products.service';

const PAGE_SIZE = 20;

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProducts({ search, page, pageSize: PAGE_SIZE });

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
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/inventory/movements">All movements</Link>
        </Button>
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
