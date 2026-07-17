'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Supplier } from '@inventory-mgmt/shared-types';
import { useEffect, useState } from 'react';
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
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers';
import { ApiError } from '@/services/api-client';
import type { SupplierPayload } from '@/services/suppliers.service';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormDialogProps {
  supplier?: Supplier;
  trigger: React.ReactNode;
}

function toFormValues(supplier?: Supplier): SupplierFormValues | undefined {
  if (!supplier) return undefined;
  return {
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
  };
}

export function SupplierFormDialog({ supplier, trigger }: SupplierFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isEditing = Boolean(supplier);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: toFormValues(supplier),
  });

  useEffect(() => {
    if (open) reset(toFormValues(supplier));
  }, [open, supplier, reset]);

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  const onSubmit = (values: SupplierFormValues) => {
    const payload: SupplierPayload = { ...values, email: values.email || undefined };
    const onError = (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Failed to save supplier');
    };

    if (isEditing && supplier) {
      updateSupplier.mutate(
        { id: supplier.id, payload },
        {
          onSuccess: () => {
            toast.success('Supplier updated');
            setOpen(false);
          },
          onError,
        },
      );
    } else {
      createSupplier.mutate(payload, {
        onSuccess: () => {
          toast.success('Supplier created');
          reset({ name: '', contactPerson: '', email: '', phone: '', address: '' });
          setOpen(false);
        },
        onError,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" {...register('contactPerson')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email ? (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={2} {...register('address')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
