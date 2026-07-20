'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type PurchaseReturnDoc,
} from '@inventory-mgmt/shared-types';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
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
import { usePartners } from '@/hooks/use-partners';
import { usePrincipal } from '@/hooks/use-principal';
import { useCreatePurchaseReturn, usePurchaseReturns } from '@/hooks/use-procurement';
import { useWarehouses } from '@/hooks/use-settings';

export default function PurchaseReturnsPage() {
  const { data: returns, isLoading } = usePurchaseReturns();
  const { data: suppliersPage } = usePartners({ role: 'supplier', pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const { data: reasonCodes } = useReasonCodes('purchase_return');
  const createReturn = useCreatePurchaseReturn();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.PROCUREMENT, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [lines, setLines] = useState<DocLine[]>([]);

  const suppliers = suppliersPage?.data ?? [];

  const columns: DataTableColumn<PurchaseReturnDoc>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (ret) => <span className="font-mono text-xs">{ret.docNo}</span>,
    },
    { key: 'supplier', header: 'Supplier', render: (ret) => ret.supplierName ?? ret.supplierId },
    { key: 'lines', header: 'Lines', render: (ret) => ret.lines.length },
    {
      key: 'reason',
      header: 'Reason',
      render: (ret) => ret.reasonCode ?? ret.reasonText ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (ret) => (
        <Badge variant={ret.status === 'posted' ? 'default' : 'secondary'}>{ret.status}</Badge>
      ),
    },
  ];

  const canSubmit =
    supplierId &&
    warehouseId &&
    (reasonCodeId || reasonText.trim()) &&
    lines.some((line) => line.itemId && Number(line.qty) > 0) &&
    !createReturn.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/procurement">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Supplier returns</h1>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Return goods to supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>From warehouse</Label>
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
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a reason code" />
                    </SelectTrigger>
                    <SelectContent>
                      {(reasonCodes ?? []).map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Details</Label>
                  <Textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="What is being returned and why"
                    rows={2}
                  />
                </div>
                <LineEditor lines={lines} onChange={setLines} />
              </div>
              <DialogFooter>
                <Button
                  disabled={!canSubmit}
                  onClick={() =>
                    createReturn.mutate(
                      {
                        supplierId,
                        warehouseId,
                        reasonCodeId: reasonCodeId || undefined,
                        reasonText: reasonText.trim() || undefined,
                        lines: lines
                          .filter((line) => line.itemId && Number(line.qty) > 0)
                          .map((line) => ({ itemId: line.itemId, qty: Number(line.qty) })),
                      },
                      {
                        onSuccess: () => {
                          toast.success('Return posted — stock updated');
                          setOpen(false);
                          setLines([]);
                          setReasonText('');
                          setReasonCodeId('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Post return
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={returns ?? []}
        loading={isLoading}
        emptyMessage="No supplier returns yet"
      />
    </div>
  );
}
