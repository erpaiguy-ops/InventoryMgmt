'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';

export interface OrderFormItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderFormProduct {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
}

interface OrderFormProps {
  products: OrderFormProduct[];
  value: OrderFormItem[];
  onChange: (items: OrderFormItem[]) => void;
}

export function OrderForm({ products, value, onChange }: OrderFormProps) {
  const productById = new Map(products.map((p) => [p.id, p]));
  const total = value.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const addItem = () => {
    const firstAvailable = products.find((p) => !value.some((item) => item.productId === p.id));
    if (!firstAvailable) return;
    onChange([
      ...value,
      { productId: firstAvailable.id, quantity: 1, unitPrice: firstAvailable.unitPrice },
    ]);
  };

  const updateItem = (index: number, patch: Partial<OrderFormItem>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-muted-foreground text-xs">Product</label>
            <Select
              value={item.productId}
              onValueChange={(productId) => {
                const product = productById.get(productId);
                updateItem(index, { productId, unitPrice: product?.unitPrice ?? item.unitPrice });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <label className="text-muted-foreground text-xs">Quantity</label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
            />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-muted-foreground text-xs">Unit price</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
            />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-muted-foreground text-xs">Line total</label>
            <p className="px-1 py-2 text-sm">{formatCurrency(item.quantity * item.unitPrice)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>

      <p className="text-right text-sm font-medium">Total: {formatCurrency(total)}</p>
    </div>
  );
}
