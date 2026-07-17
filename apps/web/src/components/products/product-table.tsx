'use client';

import { Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteProduct } from '@/hooks/use-products';
import { ApiError } from '@/services/api-client';
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
  const deleteProduct = useDeleteProduct();

  const handleDelete = (product: ProductWithInventory) => {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;

    deleteProduct.mutate(product.id, {
      onSuccess: () => toast.success('Product deleted'),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete product');
      },
    });
  };

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
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => router.push(`/dashboard/products/${p.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View / Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => handleDelete(p)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
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
