'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type PurchaseOrderDoc,
} from '@inventory-mgmt/shared-types';
import { FileText, Plus, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PoLineEditor, type PoLine } from '@/components/procurement/po-line-editor';
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
import { usePartners } from '@/hooks/use-partners';
import { usePrincipal } from '@/hooks/use-principal';
import { useCreatePo, usePurchaseOrders } from '@/hooks/use-procurement';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<
  PurchaseOrderDoc['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  pending_approval: 'outline',
  confirmed: 'default',
  received: 'default',
  cancelled: 'secondary',
  rejected: 'destructive',
};

export default function ProcurementPage() {
  const router = useRouter();
  const { data: pos, isLoading } = usePurchaseOrders();
  const { data: suppliersPage } = usePartners({ role: 'supplier', pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const createPo = useCreatePo();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.PROCUREMENT, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<PoLine[]>([]);

  const suppliers = suppliersPage?.data ?? [];

  const columns: DataTableColumn<PurchaseOrderDoc>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (po) => <span className="font-mono text-xs">{po.docNo}</span>,
    },
    { key: 'supplier', header: 'Supplier', render: (po) => po.supplierName ?? po.supplierId },
    { key: 'date', header: 'Order date', render: (po) => po.orderDate },
    { key: 'lines', header: 'Lines', render: (po) => po.lines.length },
    {
      key: 'total',
      header: 'Total',
      render: (po) => Number(po.total).toFixed(2),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => (
        <Badge variant={STATUS_VARIANT[po.status]}>{po.status.replace('_', ' ')}</Badge>
      ),
    },
  ];

  const canSubmit =
    supplierId &&
    warehouseId &&
    lines.some((line) => line.itemId && Number(line.qty) > 0) &&
    !createPo.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase orders</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/procurement/bills">
              <FileText className="mr-2 h-4 w-4" /> Bills
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/procurement/returns">
              <RotateCcw className="mr-2 h-4 w-4" /> Returns
            </Link>
          </Button>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>New purchase order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
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
                      <Label>Deliver to</Label>
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
                      <Label>Expected date</Label>
                      <Input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <PoLineEditor lines={lines} onChange={setLines} />
                </div>
                <DialogFooter>
                  <Button
                    disabled={!canSubmit}
                    onClick={() =>
                      createPo.mutate(
                        {
                          supplierId,
                          warehouseId,
                          expectedDate: expectedDate || undefined,
                          lines: lines
                            .filter((line) => line.itemId && Number(line.qty) > 0)
                            .map((line) => ({
                              itemId: line.itemId,
                              qty: Number(line.qty),
                              unitPrice: Number(line.unitPrice) || 0,
                              taxId: line.taxId || undefined,
                            })),
                        },
                        {
                          onSuccess: (po) => {
                            toast.success(`PO ${po.docNo} created`);
                            setOpen(false);
                            setLines([]);
                            router.push(`/dashboard/procurement/${po.id}`);
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
      </div>
      <DataTable
        columns={columns}
        data={pos ?? []}
        loading={isLoading}
        emptyMessage="No purchase orders yet"
        onRowClick={(po) => router.push(`/dashboard/procurement/${po.id}`)}
      />
    </div>
  );
}
