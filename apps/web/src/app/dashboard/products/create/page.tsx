'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProductForm } from '@/components/products/product-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateProduct } from '@/hooks/use-products';
import { ApiError } from '@/services/api-client';

export default function CreateProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Add Product</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            isSubmitting={createProduct.isPending}
            submitLabel="Create product"
            onSubmit={(values) => {
              createProduct.mutate(values, {
                onSuccess: (product) => {
                  toast.success(`Product "${product.name}" created`);
                  router.push('/dashboard/products');
                },
                onError: (error) => {
                  toast.error(
                    error instanceof ApiError ? error.message : 'Failed to create product',
                  );
                },
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
