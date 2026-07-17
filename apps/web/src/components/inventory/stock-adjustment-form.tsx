'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdjustStock } from '@/hooks/use-inventory';
import { ApiError } from '@/services/api-client';

const adjustmentSchema = z.object({
  adjustment: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, 'Adjustment cannot be zero'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

type AdjustmentValues = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentFormProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
}

export function StockAdjustmentForm({ productId, productName, trigger }: StockAdjustmentFormProps) {
  const [open, setOpen] = useState(false);
  const adjustStock = useAdjustStock();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustmentValues>({ resolver: zodResolver(adjustmentSchema) });

  const onSubmit = (values: AdjustmentValues) => {
    adjustStock.mutate(
      { productId, ...values },
      {
        onSuccess: () => {
          toast.success(`Stock adjusted for ${productName}`);
          reset();
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : 'Failed to adjust stock');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Adjust stock</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment">Adjustment (positive to add, negative to remove)</Label>
            <Input id="adjustment" type="number" {...register('adjustment')} />
            {errors.adjustment ? (
              <p className="text-destructive text-sm">{errors.adjustment.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" {...register('reason')} />
            {errors.reason ? (
              <p className="text-destructive text-sm">{errors.reason.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={adjustStock.isPending}>
              {adjustStock.isPending ? 'Saving...' : 'Apply adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
