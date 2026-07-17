'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { OrderForm, type OrderFormItem } from '@/components/orders/order-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePurchaseOrder } from '@/hooks/use-orders';
import { useProducts } from '@/hooks/use-products';
import { useSuppliers } from '@/hooks/use-suppliers';
import { ApiError } from '@/services/api-client';

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderFormItem[]>([]);

  const { data: suppliersData } = useSuppliers({ pageSize: 100 });
  const { data: productsData } = useProducts({ pageSize: 100 });
  const createPurchaseOrder = useCreatePurchaseOrder();

  const products = (productsData?.data ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unitPrice: p.unitPrice,
  }));

  const handleSubmit = () => {
    if (!supplierId) {
      toast.error('Select a supplier');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    createPurchaseOrder.mutate(
      {
        supplierId,
        expectedDelivery: expectedDelivery || undefined,
        notes: notes || undefined,
        items,
      },
      {
        onSuccess: (po) => {
          toast.success(`Purchase order ${po.poNumber} created`);
          router.push(`/dashboard/purchase-orders/${po.id}`);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError ? error.message : 'Failed to create purchase order',
          );
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">New Purchase Order</h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(suppliersData?.data ?? []).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm products={products} value={items} onChange={setItems} />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={createPurchaseOrder.isPending}>
        {createPurchaseOrder.isPending ? 'Creating...' : 'Create purchase order'}
      </Button>
    </div>
  );
}
