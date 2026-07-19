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

export interface DocLine {
  itemId: string;
  qty: string;
  unitCost: string;
  batchNo: string;
}

interface LineEditorProps {
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  /** Show the unit-cost column (receipts need it; issues/transfers don't). */
  withCost?: boolean;
  /** Show a free-text batch column (adjustments create batches by number). */
  withBatch?: boolean;
  /** Allow negative quantities (adjustments); transfers require positive. */
  allowNegative?: boolean;
}

export function LineEditor({
  lines,
  onChange,
  withCost,
  withBatch,
  allowNegative,
}: LineEditorProps) {
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const items = itemsPage?.data ?? [];

  const update = (index: number, patch: Partial<DocLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

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
          {withBatch && (
            <Input
              className="w-28"
              placeholder="Batch no"
              value={line.batchNo}
              onChange={(e) => update(index, { batchNo: e.target.value })}
            />
          )}
          <Input
            className="w-24"
            type="number"
            step="any"
            min={allowNegative ? undefined : 0}
            placeholder="Qty"
            value={line.qty}
            onChange={(e) => update(index, { qty: e.target.value })}
          />
          {withCost && (
            <Input
              className="w-28"
              type="number"
              step="0.01"
              min={0}
              placeholder="Unit cost"
              value={line.unitCost}
              onChange={(e) => update(index, { unitCost: e.target.value })}
            />
          )}
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...lines, { itemId: '', qty: '', unitCost: '', batchNo: '' }])}
      >
        <Plus className="mr-2 h-4 w-4" /> Add line
      </Button>
    </div>
  );
}
