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
import { useItems } from '@/hooks/use-items';
import { useTaxes } from '@/hooks/use-settings';

export interface PoLine {
  itemId: string;
  qty: string;
  unitPrice: string;
  taxId: string;
}

interface PoLineEditorProps {
  lines: PoLine[];
  onChange: (lines: PoLine[]) => void;
}

const NO_TAX = 'none';

export function PoLineEditor({ lines, onChange }: PoLineEditorProps) {
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const { data: taxes } = useTaxes();
  const items = itemsPage?.data ?? [];

  const update = (index: number, patch: Partial<PoLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0),
    0,
  );

  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select value={line.itemId} onValueChange={(v) => update(index, { itemId: v })}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Item" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-24"
            type="number"
            step="any"
            min={0}
            placeholder="Qty"
            value={line.qty}
            onChange={(e) => update(index, { qty: e.target.value })}
          />
          <Input
            className="w-28"
            type="number"
            step="0.01"
            min={0}
            placeholder="Unit price"
            value={line.unitPrice}
            onChange={(e) => update(index, { unitPrice: e.target.value })}
          />
          <Select
            value={line.taxId || NO_TAX}
            onValueChange={(v) => update(index, { taxId: v === NO_TAX ? '' : v })}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Tax" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TAX}>No tax</SelectItem>
              {(taxes ?? []).map((tax) => (
                <SelectItem key={tax.id} value={tax.id}>
                  {tax.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...lines, { itemId: '', qty: '', unitPrice: '', taxId: '' }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Add line
        </Button>
        <span className="text-muted-foreground text-sm">Subtotal: {subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
