'use client';

import type { StockLedgerEntry } from '@inventory-mgmt/shared-types';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLedger } from '@/hooks/use-inventory';
import { useWarehouses } from '@/hooks/use-settings';

const ALL = '__all__';

export default function MovementsPage() {
  const [warehouseId, setWarehouseId] = useState(ALL);
  const { data: warehouses } = useWarehouses();
  const { data: entries, isLoading } = useLedger({
    warehouseId: warehouseId === ALL ? undefined : warehouseId,
  });

  const columns: DataTableColumn<StockLedgerEntry>[] = [
    {
      key: 'when',
      header: 'When',
      render: (e) => new Date(e.createdAt).toLocaleString(),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (e) => <span className="font-mono text-xs">{e.itemSku}</span>,
    },
    { key: 'item', header: 'Item', render: (e) => e.itemName },
    { key: 'warehouse', header: 'Warehouse', render: (e) => e.warehouseCode },
    {
      key: 'type',
      header: 'Movement',
      render: (e) => <Badge variant="outline">{e.movementType.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (e) => (
        <span className={e.qty < 0 ? 'text-destructive font-medium' : 'font-medium'}>
          {e.qty > 0 ? `+${e.qty}` : e.qty}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Unit cost',
      render: (e) => (e.unitCost != null ? Number(e.unitCost).toFixed(2) : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Stock movements</h1>
      <Select value={warehouseId} onValueChange={setWarehouseId}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All warehouses</SelectItem>
          {(warehouses ?? []).map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              {warehouse.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DataTable
        columns={columns}
        data={entries ?? []}
        loading={isLoading}
        emptyMessage="No movements yet — the ledger fills as documents post"
      />
    </div>
  );
}
