'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProducts } from '@/hooks/use-products';
import { formatCurrency } from '@/utils/format';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useProducts({ page: 1, pageSize: 20 });

  return (
    <main className="container py-10">
      <h1 className="mb-6 text-2xl font-semibold">Products</h1>

      {isLoading ? <p className="text-muted-foreground">Loading products...</p> : null}
      {isError ? (
        <p className="text-destructive">
          Failed to load products: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="text-base">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1 text-sm">
              <p>SKU: {product.sku}</p>
              <p>Unit price: {formatCurrency(product.unitPrice)}</p>
              <p>Reorder level: {product.reorderLevel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.data.length === 0 ? (
        <p className="text-muted-foreground">No products yet. Create one to get started.</p>
      ) : null}
    </main>
  );
}
