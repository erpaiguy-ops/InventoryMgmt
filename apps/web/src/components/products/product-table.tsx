'use client';

import { useRouter } from 'next/navigation';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import type { ProductWithInventory } from '@/services/products.service';
import { formatCurrency } from '@/utils/format';

interface ProductTableProps {
  products: ProductWithInventory[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function ProductTable({ products, loading, pagination }: ProductTableProps) {
  const router = useRouter();

  const columns: DataTableColumn<ProductWithInventory>[] = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (p) => p.category ?? '—' },
    {
      key: 'stock',
      header: 'In stock',
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
    { key: 'unitPrice', header: 'Unit price', render: (p) => formatCurrency(p.unitPrice) },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      loading={loading}
      emptyMessage="No products yet. Create one to get started."
      pagination={pagination}
      onRowClick={(product) => router.push(`/dashboard/products/${product.id}`)}
    />
  );
}
