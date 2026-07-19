'use client';

import { ACTIONS, hasPermission, MODULES, type StockTransfer } from '@inventory-mgmt/shared-types';
import { Plus, Send, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { LineEditor, type DocLine } from '@/components/inventory/line-editor';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateTransfer,
  useDispatchTransfer,
  useReceiveTransfer,
  useTransfers,
} from '@/hooks/use-inventory';
import { usePrincipal } from '@/hooks/use-principal';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<StockTransfer['status'], 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  in_transit: 'outline',
  received: 'default',
  cancelled: 'secondary',
};

export default function TransfersPage() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: warehouses } = useWarehouses();
  const createTransfer = useCreateTransfer();
  const dispatchTransfer = useDispatchTransfer();
  const receiveTransfer = useReceiveTransfer();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.UPDATE);

  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [lines, setLines] = useState<DocLine[]>([]);

  const warehouseCode = (id: string) => (warehouses ?? []).find((w) => w.id === id)?.code ?? id;

  const columns: DataTableColumn<StockTransfer>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (t) => <span className="font-mono text-xs">{t.docNo}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      render: (t) => `${warehouseCode(t.fromWarehouseId)} → ${warehouseCode(t.toWarehouseId)}`,
    },
    { key: 'lines', header: 'Lines', render: (t) => t.lines.length },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <Badge variant={STATUS_VARIANT[t.status]}>{t.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (t) =>
        canUpdate ? (
          <div className="flex gap-1">
            {t.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  dispatchTransfer.mutate(t.id, {
                    onSuccess: () => toast.success(`${t.docNo} dispatched`),
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  })
                }
              >
                <Send className="mr-1 h-3 w-3" /> Dispatch
              </Button>
            )}
            {t.status === 'in_transit' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  receiveTransfer.mutate(t.id, {
                    onSuccess: () => toast.success(`${t.docNo} received`),
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  })
                }
              >
                <PackageCheck className="mr-1 h-3 w-3" /> Receive
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  const canSubmit =
    fromId &&
    toId &&
    fromId !== toId &&
    lines.some((line) => line.itemId && Number(line.qty) > 0) &&
    !createTransfer.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock transfers</h1>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New stock transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>From warehouse</Label>
                    <Select value={fromId} onValueChange={setFromId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {(warehouses ?? []).map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.code} — {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>To warehouse</Label>
                    <Select value={toId} onValueChange={setToId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {(warehouses ?? [])
                          .filter((warehouse) => warehouse.id !== fromId)
                          .map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.code} — {warehouse.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <LineEditor lines={lines} onChange={setLines} />
              </div>
              <DialogFooter>
                <Button
                  disabled={!canSubmit}
                  onClick={() =>
                    createTransfer.mutate(
                      {
                        fromWarehouseId: fromId,
                        toWarehouseId: toId,
                        lines: lines
                          .filter((line) => line.itemId && Number(line.qty) > 0)
                          .map((line) => ({ itemId: line.itemId, qty: Number(line.qty) })),
                      },
                      {
                        onSuccess: (t) => {
                          toast.success(`Transfer ${t.docNo} created`);
                          setOpen(false);
                          setLines([]);
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Create draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={transfers ?? []}
        loading={isLoading}
        emptyMessage="No transfers yet"
      />
    </div>
  );
}
