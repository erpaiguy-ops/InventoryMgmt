'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductPayload } from '@/services/products.service';

const productSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.coerce.number().min(0, 'Unit price must be at least 0'),
  costPrice: z.coerce.number().min(0, 'Cost price must be at least 0').optional(),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level must be at least 0').optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductPayload) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save product',
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          sku: values.sku?.trim() || undefined,
        }),
      )}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name')} />
          {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU (auto-generated if left blank)</Label>
          <Input id="sku" {...register('sku')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register('description')} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" {...register('category')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorderLevel">Reorder level</Label>
          <Input id="reorderLevel" type="number" min={0} {...register('reorderLevel')} />
          {errors.reorderLevel ? (
            <p className="text-destructive text-sm">{errors.reorderLevel.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit price</Label>
          <Input id="unitPrice" type="number" step="0.01" min={0} {...register('unitPrice')} />
          {errors.unitPrice ? (
            <p className="text-destructive text-sm">{errors.unitPrice.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">Cost price</Label>
          <Input id="costPrice" type="number" step="0.01" min={0} {...register('costPrice')} />
          {errors.costPrice ? (
            <p className="text-destructive text-sm">{errors.costPrice.message}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
