'use client';

import { ACTIONS, hasPermission, MODULES, type SalesReturnDoc } from '@inventory-mgmt/shared-types';
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
import { useCreateSalesReturn, useSalesReturns } from '@/hooks/use-sales';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<
  SalesReturnDoc['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  pending_approval: 'outline',
  posted: 'default',
  rejected: 'destructive',
};

export default function SalesReturnsPage() {
  const { data: returns, isLoading } = useSalesReturns();
  const { data: customersPage } = usePartners({ role: 'customer', pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const { data: reasonCodes } = useReasonCodes('sales_return');
  const createReturn = useCreateSalesReturn();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.SALES, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [lines, setLines] = useState<DocLine[]>([]);

  const customers = customersPage?.data ?? [];

  const columns: DataTableColumn<SalesReturnDoc>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (ret) => <span className="font-mono text-xs">{ret.docNo}</span>,
    },
    { key: 'customer', header: 'Customer', render: (ret) => ret.customerName ?? ret.customerId },
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
        <Badge variant={STATUS_VARIANT[ret.status]}>{ret.status.replace('_', ' ')}</Badge>
      ),
    },
  ];

  const canSubmit =
    customerId &&
    warehouseId &&
    (reasonCodeId || reasonText.trim()) &&
    lines.some((line) => line.itemId && Number(line.qty) > 0) &&
    !createReturn.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Customer returns</h1>
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
                <DialogTitle>Receive return from customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                    <Label>Into warehouse</Label>
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
                        customerId,
                        warehouseId,
                        reasonCodeId: reasonCodeId || undefined,
                        reasonText: reasonText.trim() || undefined,
                        lines: lines
                          .filter((line) => line.itemId && Number(line.qty) > 0)
                          .map((line) => ({ itemId: line.itemId, qty: Number(line.qty) })),
                      },
                      {
                        onSuccess: () => {
                          toast.success(
                            'Return submitted for approval — stock updates once approved',
                          );
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
                  Submit for approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Customer returns need approval before stock re-enters — check the Approvals inbox to act on
        pending returns.
      </p>
      <DataTable
        columns={columns}
        data={returns ?? []}
        loading={isLoading}
        emptyMessage="No customer returns yet"
      />
    </div>
  );
}
