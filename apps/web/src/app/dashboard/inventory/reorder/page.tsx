'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type ReorderRule,
  type ReorderSuggestion,
} from '@inventory-mgmt/shared-types';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useReorderRules,
  useReorderSuggestions,
  useUpsertReorderRule,
} from '@/hooks/use-inventory';
import { useItems } from '@/hooks/use-items';
import { usePrincipal } from '@/hooks/use-principal';
import { useWarehouses } from '@/hooks/use-settings';

export default function ReorderPage() {
  const { data: rules, isLoading: rulesLoading } = useReorderRules();
  const { data: suggestions, isLoading: suggestionsLoading } = useReorderSuggestions();
  const { data: warehouses } = useWarehouses();
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const upsertRule = useUpsertReorderRule();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canUpdate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.UPDATE);

  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [minQty, setMinQty] = useState('');
  const [reorderQty, setReorderQty] = useState('');

  const warehouseCode = (id: string) => (warehouses ?? []).find((w) => w.id === id)?.code ?? id;

  const ruleColumns: DataTableColumn<ReorderRule>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (r) => <span className="font-mono text-xs">{r.itemSku}</span>,
    },
    { key: 'item', header: 'Item', render: (r) => r.itemName },
    { key: 'warehouse', header: 'Warehouse', render: (r) => warehouseCode(r.warehouseId) },
    { key: 'min', header: 'Min qty', render: (r) => r.minQty },
    { key: 'reorder', header: 'Reorder qty', render: (r) => r.reorderQty },
  ];

  const suggestionColumns: DataTableColumn<ReorderSuggestion & { id: string }>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (s) => <span className="font-mono text-xs">{s.itemSku}</span>,
    },
    { key: 'item', header: 'Item', render: (s) => s.itemName },
    { key: 'warehouse', header: 'Warehouse', render: (s) => s.warehouseCode },
    {
      key: 'onhand',
      header: 'On hand',
      render: (s) => <Badge variant="destructive">{s.qtyOnHand}</Badge>,
    },
    { key: 'min', header: 'Min', render: (s) => s.minQty },
    { key: 'suggested', header: 'Suggested buy', render: (s) => s.suggestedQty },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Replenishment</h1>
        {canUpdate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Set rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reorder rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Item</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {(itemsPage?.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sku} — {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Warehouse</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses ?? []).map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rr-min">Min qty (alert below)</Label>
                    <Input
                      id="rr-min"
                      type="number"
                      min={0}
                      step="any"
                      value={minQty}
                      onChange={(e) => setMinQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rr-qty">Reorder qty</Label>
                    <Input
                      id="rr-qty"
                      type="number"
                      min={0}
                      step="any"
                      value={reorderQty}
                      onChange={(e) => setReorderQty(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!itemId || !warehouseId || minQty === '' || upsertRule.isPending}
                  onClick={() =>
                    upsertRule.mutate(
                      {
                        itemId,
                        warehouseId,
                        minQty: Number(minQty),
                        reorderQty: Number(reorderQty) || 0,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Rule saved');
                          setOpen(false);
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Buy suggestions</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="suggestions">
          <DataTable
            columns={suggestionColumns}
            data={(suggestions ?? []).map((s) => ({ ...s, id: `${s.itemId}:${s.warehouseId}` }))}
            loading={suggestionsLoading}
            emptyMessage="Nothing below its minimum — no purchases suggested"
          />
        </TabsContent>
        <TabsContent value="rules">
          <DataTable
            columns={ruleColumns}
            data={rules ?? []}
            loading={rulesLoading}
            emptyMessage="No reorder rules yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
