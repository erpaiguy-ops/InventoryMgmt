'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { OrderForm, type OrderFormItem } from '@/components/orders/order-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSalesOrder } from '@/hooks/use-orders';
import { useProducts } from '@/hooks/use-products';
import { ApiError } from '@/services/api-client';

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderFormItem[]>([]);

  const { data: productsData } = useProducts({ pageSize: 100 });
  const createSalesOrder = useCreateSalesOrder();

  const products = (productsData?.data ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unitPrice: p.unitPrice,
  }));

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    createSalesOrder.mutate(
      {
        customerName,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        items,
      },
      {
        onSuccess: (so) => {
          toast.success(`Sales order ${so.orderNumber} created`);
          router.push(`/dashboard/sales-orders/${so.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : 'Failed to create sales order');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">New Sales Order</h1>

      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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

      <Button onClick={handleSubmit} disabled={createSalesOrder.isPending}>
        {createSalesOrder.isPending ? 'Creating...' : 'Create sales order'}
      </Button>
    </div>
  );
}
