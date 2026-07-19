'use client';

import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreatePriceList,
  useItems,
  usePriceListPrices,
  usePriceLists,
  useSetPrices,
} from '@/hooks/use-items';
import { usePrincipal } from '@/hooks/use-principal';
import type { PricePayload } from '@/services/items.service';

interface PriceLine {
  itemId: string;
  minQty: string;
  unitPrice: string;
}

export default function PriceListsPage() {
  const { data: priceLists, isLoading } = usePriceLists();
  const createPriceList = useCreatePriceList();
  const setPrices = useSetPrices();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.ITEMS, ACTIONS.MANAGE);

  const [selectedId, setSelectedId] = useState<string>('');
  const { data: prices, isLoading: pricesLoading } = usePriceListPrices(selectedId || undefined);
  const { data: itemsPage } = useItems({ pageSize: 100 });

  const [lines, setLines] = useState<PriceLine[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'sales' | 'purchase'>('sales');

  useEffect(() => {
    const first = priceLists?.[0];
    if (!selectedId && first) {
      setSelectedId(first.id);
    }
  }, [priceLists, selectedId]);

  useEffect(() => {
    setLines(
      (prices ?? []).map((price) => ({
        itemId: price.itemId,
        minQty: String(price.minQty),
        unitPrice: String(price.unitPrice),
      })),
    );
  }, [prices]);

  if (isLoading) return <LoadingSpinner />;

  const selected = (priceLists ?? []).find((list) => list.id === selectedId);
  const items = itemsPage?.data ?? [];
  const itemLabel = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    return item ? `${item.sku} — ${item.name}` : id;
  };

  const savePrices = () => {
    const payload: PricePayload[] = lines
      .filter((line) => line.itemId && line.unitPrice !== '')
      .map((line) => ({
        itemId: line.itemId,
        minQty: Number(line.minQty) || 1,
        unitPrice: Number(line.unitPrice),
      }));
    setPrices.mutate(
      { priceListId: selectedId, prices: payload },
      {
        onSuccess: () => toast.success('Prices saved'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save prices'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Price lists</h1>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New price list
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New price list</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="pl-name">Name</Label>
                  <Input
                    id="pl-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!newName || createPriceList.isPending}
                  onClick={() =>
                    createPriceList.mutate(
                      { name: newName, listType: newType },
                      {
                        onSuccess: (list) => {
                          toast.success('Price list created');
                          setDialogOpen(false);
                          setNewName('');
                          setSelectedId(list.id);
                        },
                        onError: (e) =>
                          toast.error(e instanceof Error ? e.message : 'Failed to create'),
                      },
                    )
                  }
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a price list" />
          </SelectTrigger>
          <SelectContent>
            {(priceLists ?? []).map((list) => (
              <SelectItem key={list.id} value={list.id}>
                {list.name} ({list.listType})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected?.isDefault && <Badge>default {selected.listType}</Badge>}
      </div>

      {selectedId &&
        (pricesLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-28">Min qty</TableHead>
                    <TableHead className="w-32">Unit price</TableHead>
                    {canManage && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {canManage ? (
                          <Select
                            value={line.itemId}
                            onValueChange={(v) =>
                              setLines((ls) =>
                                ls.map((l, i) => (i === index ? { ...l, itemId: v } : l)),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.sku} — {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          itemLabel(line.itemId)
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          step="any"
                          disabled={!canManage}
                          value={line.minQty}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, i) =>
                                i === index ? { ...l, minQty: e.target.value } : l,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!canManage}
                          value={line.unitPrice}
                          onChange={(e) =>
                            setLines((ls) =>
                              ls.map((l, i) =>
                                i === index ? { ...l, unitPrice: e.target.value } : l,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLines((ls) => ls.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        No prices in this list yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setLines((ls) => [...ls, { itemId: '', minQty: '1', unitPrice: '' }])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add row
                </Button>
                <Button disabled={setPrices.isPending} onClick={savePrices}>
                  Save prices
                </Button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
