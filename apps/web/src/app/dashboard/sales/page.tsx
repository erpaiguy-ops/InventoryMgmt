'use client';

import { ACTIONS, hasPermission, MODULES, type SalesOrderDoc } from '@inventory-mgmt/shared-types';
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
import { useCreateSo, useSalesOrders } from '@/hooks/use-sales';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<
  SalesOrderDoc['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  pending_approval: 'outline',
  confirmed: 'default',
  delivered: 'default',
  cancelled: 'secondary',
  rejected: 'destructive',
};

export default function SalesPage() {
  const router = useRouter();
  const { data: sos, isLoading } = useSalesOrders();
  const { data: customersPage } = usePartners({ role: 'customer', pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const createSo = useCreateSo();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.SALES, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<PoLine[]>([]);

  const customers = customersPage?.data ?? [];

  const columns: DataTableColumn<SalesOrderDoc>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (so) => <span className="font-mono text-xs">{so.docNo}</span>,
    },
    { key: 'customer', header: 'Customer', render: (so) => so.customerName ?? so.customerId },
    { key: 'date', header: 'Order date', render: (so) => so.orderDate },
    { key: 'lines', header: 'Lines', render: (so) => so.lines.length },
    {
      key: 'total',
      header: 'Total',
      render: (so) => Number(so.total).toFixed(2),
    },
    {
      key: 'status',
      header: 'Status',
      render: (so) => (
        <Badge variant={STATUS_VARIANT[so.status]}>{so.status.replace('_', ' ')}</Badge>
      ),
    },
  ];

  const canSubmit =
    customerId &&
    warehouseId &&
    lines.some((line) => line.itemId && Number(line.qty) > 0) &&
    !createSo.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales orders</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/sales/invoices">
              <FileText className="mr-2 h-4 w-4" /> Invoices
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/sales/returns">
              <RotateCcw className="mr-2 h-4 w-4" /> Returns
            </Link>
          </Button>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New SO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>New sales order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Customer</Label>
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Ship from</Label>
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
                      createSo.mutate(
                        {
                          customerId,
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
                          onSuccess: (so) => {
                            toast.success(`SO ${so.docNo} created`);
                            setOpen(false);
                            setLines([]);
                            router.push(`/dashboard/sales/${so.id}`);
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
        data={sos ?? []}
        loading={isLoading}
        emptyMessage="No sales orders yet"
        onRowClick={(so) => router.push(`/dashboard/sales/${so.id}`)}
      />
    </div>
  );
}
