'use client';

import { ACTIONS, hasPermission, MODULES, type SalesOrderDoc } from '@inventory-mgmt/shared-types';
import { ArrowLeft, FileText, PackageCheck, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { usePrincipal } from '@/hooks/use-principal';
import {
  useCancelSo,
  useCreateInvoice,
  useDeliverGoods,
  useDeliveries,
  useSalesOrder,
  useSubmitSo,
} from '@/hooks/use-sales';
import { useOrgSettings, useWarehouses } from '@/hooks/use-settings';

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

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const soId = params.id;

  const { data: so, isLoading } = useSalesOrder(soId);
  const { data: deliveries } = useDeliveries(soId);
  const { data: warehouses } = useWarehouses();
  const { data: orgSettings } = useOrgSettings();
  const submitSo = useSubmitSo();
  const cancelSo = useCancelSo();
  const deliverGoods = useDeliverGoods();
  const createInvoice = useCreateInvoice();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.SALES, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.SALES, ACTIONS.UPDATE);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverWarehouseId, setDeliverWarehouseId] = useState('');
  const [deliverQty, setDeliverQty] = useState<Record<string, string>>({});
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceQty, setInvoiceQty] = useState<Record<string, string>>({});
  const [invoiceCurrency, setInvoiceCurrency] = useState('');
  const [invoiceFxRate, setInvoiceFxRate] = useState('1');

  if (isLoading || !so) {
    return <p className="text-muted-foreground text-sm">Loading sales order…</p>;
  }

  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed');

  const deliverable = so.lines.filter((line) => line.qtyDelivered < line.qty);
  const invoiceable = so.lines.filter((line) => line.qtyInvoiced < line.qtyDelivered);

  const openDeliver = () => {
    setDeliverQty(
      Object.fromEntries(
        deliverable.map((line) => [line.id, String(line.qty - line.qtyDelivered)]),
      ),
    );
    setDeliverWarehouseId(so.warehouseId);
    setDeliverOpen(true);
  };

  const openInvoice = () => {
    setInvoiceQty(
      Object.fromEntries(
        invoiceable.map((line) => [line.id, String(line.qtyDelivered - line.qtyInvoiced)]),
      ),
    );
    setInvoiceOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-mono text-2xl font-semibold">{so.docNo}</h1>
          <Badge variant={STATUS_VARIANT[so.status]}>{so.status.replace('_', ' ')}</Badge>
        </div>
        <div className="flex gap-2">
          {canUpdate && so.status === 'draft' && (
            <Button
              size="sm"
              onClick={() =>
                submitSo.mutate(soId, {
                  onSuccess: (updated) =>
                    toast.success(
                      updated.status === 'pending_approval'
                        ? `${updated.docNo} sent for approval`
                        : `${updated.docNo} confirmed`,
                    ),
                  onError,
                })
              }
            >
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          )}
          {canUpdate && ['draft', 'confirmed'].includes(so.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                cancelSo.mutate(soId, {
                  onSuccess: () => toast.success(`${so.docNo} cancelled`),
                  onError,
                })
              }
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          {canCreate && so.status === 'confirmed' && deliverable.length > 0 && (
            <Button size="sm" onClick={openDeliver}>
              <PackageCheck className="mr-2 h-4 w-4" /> Deliver goods
            </Button>
          )}
          {canCreate && invoiceable.length > 0 && (
            <Button size="sm" variant="outline" onClick={openInvoice}>
              <FileText className="mr-2 h-4 w-4" /> Create invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Customer</CardTitle>
          </CardHeader>
          <CardContent>{so.customerName ?? so.customerId}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Dates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Ordered {so.orderDate}
            {so.expectedDate ? ` · expected ${so.expectedDate}` : ''}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Totals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Subtotal {Number(so.subtotal).toFixed(2)} · Tax {Number(so.taxTotal).toFixed(2)} ·{' '}
            <span className="font-semibold">Total {Number(so.total).toFixed(2)}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {so.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}
                  </TableCell>
                  <TableCell className="text-right">{line.qty}</TableCell>
                  <TableCell className="text-right">{Number(line.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(line.lineTotal).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{line.qtyDelivered}</TableCell>
                  <TableCell className="text-right">{line.qtyInvoiced}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {(deliveries ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing delivered yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc no</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(deliveries ?? []).map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-mono text-xs">{delivery.docNo}</TableCell>
                    <TableCell>{delivery.lines.length}</TableCell>
                    <TableCell>
                      <Badge variant={delivery.status === 'posted' ? 'default' : 'secondary'}>
                        {delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {delivery.postedAt ? new Date(delivery.postedAt).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deliver dialog */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Deliver goods for {so.docNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Ship from warehouse</Label>
              <Select value={deliverWarehouseId} onValueChange={setDeliverWarehouseId}>
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
              <p className="text-muted-foreground text-xs">
                Defaults to the order&apos;s warehouse — switch if that location is short on stock.
              </p>
            </div>
            {deliverable.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}{' '}
                  <span className="text-muted-foreground">
                    (remaining {line.qty - line.qtyDelivered})
                  </span>
                </span>
                <Input
                  className="w-28"
                  type="number"
                  step="any"
                  min={0}
                  max={line.qty - line.qtyDelivered}
                  value={deliverQty[line.id] ?? ''}
                  onChange={(e) =>
                    setDeliverQty((prev) => ({ ...prev, [line.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={
                deliverGoods.isPending ||
                !deliverable.some((line) => Number(deliverQty[line.id]) > 0)
              }
              onClick={() =>
                deliverGoods.mutate(
                  {
                    soId,
                    warehouseId: deliverWarehouseId || undefined,
                    lines: deliverable
                      .filter((line) => Number(deliverQty[line.id]) > 0)
                      .map((line) => ({ soLineId: line.id, qty: Number(deliverQty[line.id]) })),
                  },
                  {
                    onSuccess: (delivery) => {
                      toast.success(`Delivery ${delivery.docNo} posted — stock updated`);
                      setDeliverOpen(false);
                    },
                    onError,
                  },
                )
              }
            >
              Post delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create invoice for {so.docNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {invoiceable.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}{' '}
                  <span className="text-muted-foreground">
                    (invoiceable {line.qtyDelivered - line.qtyInvoiced})
                  </span>
                </span>
                <Input
                  className="w-28"
                  type="number"
                  step="any"
                  min={0}
                  max={line.qtyDelivered - line.qtyInvoiced}
                  value={invoiceQty[line.id] ?? ''}
                  onChange={(e) =>
                    setInvoiceQty((prev) => ({ ...prev, [line.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input
                value={invoiceCurrency}
                placeholder={orgSettings?.currency ?? 'USD'}
                onChange={(e) => setInvoiceCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="space-y-1">
              <Label>FX rate (to base currency)</Label>
              <Input
                type="number"
                step="any"
                min={0}
                value={invoiceFxRate}
                onChange={(e) => setInvoiceFxRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                createInvoice.isPending ||
                !invoiceable.some((line) => Number(invoiceQty[line.id]) > 0)
              }
              onClick={() =>
                createInvoice.mutate(
                  {
                    soId,
                    currency: invoiceCurrency.trim() || undefined,
                    fxRate: Number(invoiceFxRate) || 1,
                    lines: invoiceable
                      .filter((line) => Number(invoiceQty[line.id]) > 0)
                      .map((line) => ({ soLineId: line.id, qty: Number(invoiceQty[line.id]) })),
                  },
                  {
                    onSuccess: (invoice) => {
                      toast.success(`Invoice ${invoice.docNo} created`);
                      setInvoiceOpen(false);
                    },
                    onError,
                  },
                )
              }
            >
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
