'use client';

import type { StockBalance } from '@inventory-mgmt/shared-types';
import { ArrowLeftRight, ClipboardCheck, History, SlidersHorizontal, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBalances } from '@/hooks/use-inventory';
import { useWarehouses } from '@/hooks/use-settings';

const ALL = '__all__';

export default function InventoryPage() {
  const [warehouseId, setWarehouseId] = useState(ALL);
  const { data: warehouses } = useWarehouses();
  const { data: balances, isLoading } = useBalances(warehouseId === ALL ? undefined : warehouseId);

  const columns: DataTableColumn<StockBalance>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (b) => <span className="font-mono text-xs">{b.itemSku}</span>,
    },
    { key: 'name', header: 'Item', render: (b) => b.itemName },
    { key: 'warehouse', header: 'Warehouse', render: (b) => b.warehouseCode },
    {
      key: 'batch',
      header: 'Batch',
      render: (b) =>
        b.batchNo ? (
          <span>
            {b.batchNo}
            {b.expiryDate && (
              <span className="text-muted-foreground ml-1 text-xs">exp {b.expiryDate}</span>
            )}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'qty',
      header: 'On hand',
      render: (b) => (
        <Badge variant={b.qtyOnHand > 0 ? 'default' : 'secondary'}>{b.qtyOnHand}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/movements">
              <History className="mr-2 h-4 w-4" /> Movements
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/transfers">
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfers
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/adjustments">
              <Wrench className="mr-2 h-4 w-4" /> Adjustments
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/audits">
              <ClipboardCheck className="mr-2 h-4 w-4" /> Stock audits
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inventory/reorder">
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Reorder
            </Link>
          </Button>
        </div>
      </div>

      <Select value={warehouseId} onValueChange={setWarehouseId}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All warehouses</SelectItem>
          {(warehouses ?? []).map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              {warehouse.code} — {warehouse.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DataTable
        columns={columns}
        data={balances ?? []}
        loading={isLoading}
        emptyMessage="No stock yet — post an opening-balance adjustment to load inventory"
      />
    </div>
  );
}
