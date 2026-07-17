'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { StockMovementTable } from '@/components/inventory/stock-movement-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStockMovements } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';

const PAGE_SIZE = 20;

export default function StockMovementsPage() {
  const searchParams = useSearchParams();
  const [productId, setProductId] = useState(searchParams.get('productId') ?? '');
  const [page, setPage] = useState(1);

  const { data: products } = useProducts({ pageSize: 100 });
  const { data, isLoading } = useStockMovements(productId || undefined, {
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Stock Movements</h1>

      <Select
        value={productId}
        onValueChange={(value) => {
          setProductId(value);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select a product" />
        </SelectTrigger>
        <SelectContent>
          {(products?.data ?? []).map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {productId ? (
        <StockMovementTable
          movements={data?.data ?? []}
          loading={isLoading}
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
      ) : (
        <p className="text-muted-foreground">
          Select a product to view its stock movement history.
        </p>
      )}
    </div>
  );
}
