'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ProductForm } from '@/components/products/product-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteProduct, useProduct, useUpdateProduct } from '@/hooks/use-products';
import { ApiError } from '@/services/api-client';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return <p className="text-muted-foreground">Product not found.</p>;
  }

  const quantity = product.inventory?.quantity ?? 0;
  const isLow = quantity <= product.reorderLevel;

  const handleDelete = () => {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;

    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success('Product deleted');
        router.push('/dashboard/products');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete product');
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-muted-foreground text-sm">SKU: {product.sku}</p>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current stock: {quantity}
            {isLow ? <Badge variant="warning">Low stock</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dashboard/inventory/movements?productId=${product.id}`}
            className="text-primary text-sm hover:underline"
          >
            View stock movement history
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            defaultValues={{
              sku: product.sku,
              name: product.name,
              description: product.description ?? undefined,
              category: product.category ?? undefined,
              unitPrice: product.unitPrice,
              costPrice: product.costPrice ?? undefined,
              reorderLevel: product.reorderLevel,
            }}
            isSubmitting={updateProduct.isPending}
            submitLabel="Save changes"
            onSubmit={(values) => {
              updateProduct.mutate(
                { id: product.id, payload: values },
                {
                  onSuccess: () => toast.success('Product updated'),
                  onError: (error) => {
                    toast.error(
                      error instanceof ApiError ? error.message : 'Failed to update product',
                    );
                  },
                },
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
