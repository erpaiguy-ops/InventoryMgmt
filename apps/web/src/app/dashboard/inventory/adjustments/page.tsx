'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type StockAdjustment,
} from '@inventory-mgmt/shared-types';
import { Plus, SendHorizonal } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useReasonCodes } from '@/hooks/use-approvals';
import { useAdjustments, useCreateAdjustment, useSubmitAdjustment } from '@/hooks/use-inventory';
import { usePrincipal } from '@/hooks/use-principal';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<
  StockAdjustment['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  pending_approval: 'outline',
  posted: 'default',
  rejected: 'destructive',
};

export default function AdjustmentsPage() {
  const { data: adjustments, isLoading } = useAdjustments();
  const { data: warehouses } = useWarehouses();
  const { data: reasons } = useReasonCodes('stock_adjustment');
  const createAdjustment = useCreateAdjustment();
  const submitAdjustment = useSubmitAdjustment();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.UPDATE);

  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [lines, setLines] = useState<DocLine[]>([]);

  const [submitFor, setSubmitFor] = useState<StockAdjustment | null>(null);
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [reasonText, setReasonText] = useState('');

  const warehouseCode = (id: string) => (warehouses ?? []).find((w) => w.id === id)?.code ?? id;

  const columns: DataTableColumn<StockAdjustment>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (a) => <span className="font-mono text-xs">{a.docNo}</span>,
    },
    { key: 'warehouse', header: 'Warehouse', render: (a) => warehouseCode(a.warehouseId) },
    {
      key: 'kind',
      header: 'Kind',
      render: (a) => (a.isOpening ? 'Opening balance' : 'Adjustment'),
    },
    { key: 'lines', header: 'Lines', render: (a) => a.lines.length },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={STATUS_VARIANT[a.status]}>{a.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (a) =>
        canUpdate && a.status === 'draft' ? (
          <Button size="sm" variant="outline" onClick={() => setSubmitFor(a)}>
            <SendHorizonal className="mr-1 h-3 w-3" /> Submit
          </Button>
        ) : null,
    },
  ];

  const validLines = lines.filter((line) => line.itemId && Number(line.qty) !== 0);
  const canCreateDoc =
    warehouseId &&
    validLines.length > 0 &&
    validLines.every((line) => Number(line.qty) < 0 || line.unitCost !== '') &&
    !createAdjustment.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock adjustments</h1>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New stock adjustment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Warehouse</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Warehouse" />
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
                    <Label>Kind</Label>
                    <Select
                      value={isOpening ? 'opening' : 'adjustment'}
                      onValueChange={(v) => setIsOpening(v === 'opening')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adjustment">Adjustment (+/−)</SelectItem>
                        <SelectItem value="opening">Opening balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  Positive lines need a unit cost. Batch number is optional — it creates or reuses
                  the batch for batch-tracked items.
                </p>
                <LineEditor lines={lines} onChange={setLines} withCost withBatch allowNegative />
              </div>
              <DialogFooter>
                <Button
                  disabled={!canCreateDoc}
                  onClick={() =>
                    createAdjustment.mutate(
                      {
                        warehouseId,
                        isOpening,
                        lines: validLines.map((line) => ({
                          itemId: line.itemId,
                          qtyChange: Number(line.qty),
                          unitCost: line.unitCost === '' ? undefined : Number(line.unitCost),
                          batchNo: line.batchNo || undefined,
                        })),
                      },
                      {
                        onSuccess: (a) => {
                          toast.success(`Adjustment ${a.docNo} created as draft`);
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
        data={adjustments ?? []}
        loading={isLoading}
        emptyMessage="No adjustments yet — start with an opening-balance adjustment"
      />

      <Dialog open={submitFor !== null} onOpenChange={(o) => !o && setSubmitFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {submitFor?.docNo} for approval</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Stock will only change after the approval chain gives its final yes. The reason and
            every approver&apos;s comment stay on the record.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {(reasons ?? []).map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="adj-reason-text">Details</Label>
              <Textarea
                id="adj-reason-text"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="What happened, for the approvers"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={(!reasonCodeId && !reasonText.trim()) || submitAdjustment.isPending}
              onClick={() =>
                submitFor &&
                submitAdjustment.mutate(
                  {
                    id: submitFor.id,
                    reasonCodeId: reasonCodeId || undefined,
                    reasonText: reasonText.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      toast.success('Submitted for approval');
                      setSubmitFor(null);
                      setReasonCodeId('');
                      setReasonText('');
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  },
                )
              }
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
