'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type PurchaseOrderDoc,
} from '@inventory-mgmt/shared-types';
import { ArrowLeft, Anchor, FileText, PackageCheck, Send, XCircle } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrincipal } from '@/hooks/use-principal';
import {
  useAddLandedCost,
  useCancelPo,
  useCreateBill,
  useGoodsReceipts,
  usePurchaseOrder,
  useReceiveGoods,
  useSubmitPo,
} from '@/hooks/use-procurement';
import { useOrgSettings } from '@/hooks/use-settings';

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

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const poId = params.id;

  const { data: po, isLoading } = usePurchaseOrder(poId);
  const { data: grns } = useGoodsReceipts(poId);
  const { data: orgSettings } = useOrgSettings();
  const submitPo = useSubmitPo();
  const cancelPo = useCancelPo();
  const receiveGoods = useReceiveGoods();
  const createBill = useCreateBill();
  const addLandedCost = useAddLandedCost();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.PROCUREMENT, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.PROCUREMENT, ACTIONS.UPDATE);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [billOpen, setBillOpen] = useState(false);
  const [billQty, setBillQty] = useState<Record<string, string>>({});
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [billCurrency, setBillCurrency] = useState('');
  const [billFxRate, setBillFxRate] = useState('1');
  const [lcOpen, setLcOpen] = useState(false);
  const [lcGrId, setLcGrId] = useState('');
  const [lcDescription, setLcDescription] = useState('');
  const [lcAmount, setLcAmount] = useState('');

  if (isLoading || !po) {
    return <p className="text-muted-foreground text-sm">Loading purchase order…</p>;
  }

  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed');

  const receivable = po.lines.filter((line) => line.qtyReceived < line.qty);
  const billable = po.lines.filter((line) => line.qtyBilled < line.qtyReceived);
  const postedGrns = (grns ?? []).filter((grn) => grn.status === 'posted');

  const openReceive = () => {
    setReceiveQty(
      Object.fromEntries(receivable.map((line) => [line.id, String(line.qty - line.qtyReceived)])),
    );
    setReceiveOpen(true);
  };

  const openBill = () => {
    setBillQty(
      Object.fromEntries(
        billable.map((line) => [line.id, String(line.qtyReceived - line.qtyBilled)]),
      ),
    );
    setBillOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/procurement">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-mono text-2xl font-semibold">{po.docNo}</h1>
          <Badge variant={STATUS_VARIANT[po.status]}>{po.status.replace('_', ' ')}</Badge>
        </div>
        <div className="flex gap-2">
          {canUpdate && po.status === 'draft' && (
            <Button
              size="sm"
              onClick={() =>
                submitPo.mutate(poId, {
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
          {canUpdate && ['draft', 'confirmed'].includes(po.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                cancelPo.mutate(poId, {
                  onSuccess: () => toast.success(`${po.docNo} cancelled`),
                  onError,
                })
              }
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          {canCreate && po.status === 'confirmed' && receivable.length > 0 && (
            <Button size="sm" onClick={openReceive}>
              <PackageCheck className="mr-2 h-4 w-4" /> Receive goods
            </Button>
          )}
          {canCreate && billable.length > 0 && (
            <Button size="sm" variant="outline" onClick={openBill}>
              <FileText className="mr-2 h-4 w-4" /> Record bill
            </Button>
          )}
          {canCreate && postedGrns.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLcGrId(postedGrns[0]?.id ?? '');
                setLcOpen(true);
              }}
            >
              <Anchor className="mr-2 h-4 w-4" /> Landed cost
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Supplier</CardTitle>
          </CardHeader>
          <CardContent>{po.supplierName ?? po.supplierId}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Dates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Ordered {po.orderDate}
            {po.expectedDate ? ` · expected ${po.expectedDate}` : ''}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Totals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Subtotal {Number(po.subtotal).toFixed(2)} · Tax {Number(po.taxTotal).toFixed(2)} ·{' '}
            <span className="font-semibold">Total {Number(po.total).toFixed(2)}</span>
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
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}
                  </TableCell>
                  <TableCell className="text-right">{line.qty}</TableCell>
                  <TableCell className="text-right">{Number(line.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(line.lineTotal).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{line.qtyReceived}</TableCell>
                  <TableCell className="text-right">{line.qtyBilled}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goods receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {(grns ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing received yet</p>
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
                {(grns ?? []).map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-mono text-xs">{grn.docNo}</TableCell>
                    <TableCell>{grn.lines.length}</TableCell>
                    <TableCell>
                      <Badge variant={grn.status === 'posted' ? 'default' : 'secondary'}>
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {grn.postedAt ? new Date(grn.postedAt).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receive dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Receive goods against {po.docNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {receivable.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}{' '}
                  <span className="text-muted-foreground">
                    (remaining {line.qty - line.qtyReceived})
                  </span>
                </span>
                <Input
                  className="w-28"
                  type="number"
                  step="any"
                  min={0}
                  max={line.qty - line.qtyReceived}
                  value={receiveQty[line.id] ?? ''}
                  onChange={(e) =>
                    setReceiveQty((prev) => ({ ...prev, [line.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={
                receiveGoods.isPending ||
                !receivable.some((line) => Number(receiveQty[line.id]) > 0)
              }
              onClick={() =>
                receiveGoods.mutate(
                  {
                    poId,
                    lines: receivable
                      .filter((line) => Number(receiveQty[line.id]) > 0)
                      .map((line) => ({ poLineId: line.id, qty: Number(receiveQty[line.id]) })),
                  },
                  {
                    onSuccess: (grn) => {
                      toast.success(`Receipt ${grn.docNo} posted — stock updated`);
                      setReceiveOpen(false);
                    },
                    onError,
                  },
                )
              }
            >
              Post receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill dialog */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record supplier bill for {po.docNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Supplier bill no</Label>
              <Input
                value={supplierBillNo}
                onChange={(e) => setSupplierBillNo(e.target.value)}
                placeholder="Their invoice number"
              />
            </div>
            <div className="space-y-2">
              {billable.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">
                    <span className="font-mono text-xs">{line.itemSku}</span> {line.itemName}{' '}
                    <span className="text-muted-foreground">
                      (billable {line.qtyReceived - line.qtyBilled})
                    </span>
                  </span>
                  <Input
                    className="w-28"
                    type="number"
                    step="any"
                    min={0}
                    max={line.qtyReceived - line.qtyBilled}
                    value={billQty[line.id] ?? ''}
                    onChange={(e) => setBillQty((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input
                  value={billCurrency}
                  placeholder={orgSettings?.currency ?? 'USD'}
                  onChange={(e) => setBillCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-1">
                <Label>FX rate (to base currency)</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={billFxRate}
                  onChange={(e) => setBillFxRate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                createBill.isPending || !billable.some((line) => Number(billQty[line.id]) > 0)
              }
              onClick={() =>
                createBill.mutate(
                  {
                    poId,
                    supplierBillNo: supplierBillNo || undefined,
                    currency: billCurrency.trim() || undefined,
                    fxRate: Number(billFxRate) || 1,
                    lines: billable
                      .filter((line) => Number(billQty[line.id]) > 0)
                      .map((line) => ({ poLineId: line.id, qty: Number(billQty[line.id]) })),
                  },
                  {
                    onSuccess: (bill) => {
                      toast.success(`Bill ${bill.docNo} recorded`);
                      setBillOpen(false);
                      setSupplierBillNo('');
                    },
                    onError,
                  },
                )
              }
            >
              Record bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Landed cost dialog */}
      <Dialog open={lcOpen} onOpenChange={setLcOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add landed cost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Goods receipt</Label>
              <select
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={lcGrId}
                onChange={(e) => setLcGrId(e.target.value)}
              >
                {postedGrns.map((grn) => (
                  <option key={grn.id} value={grn.id}>
                    {grn.docNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={lcDescription}
                onChange={(e) => setLcDescription(e.target.value)}
                placeholder="Freight, duty, insurance…"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={lcAmount}
                onChange={(e) => setLcAmount(e.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              The amount is spread across the receipt&apos;s items by value and folded into their
              average cost.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                addLandedCost.isPending ||
                !lcGrId ||
                !lcDescription.trim() ||
                !(Number(lcAmount) > 0)
              }
              onClick={() =>
                addLandedCost.mutate(
                  { grId: lcGrId, description: lcDescription.trim(), amount: Number(lcAmount) },
                  {
                    onSuccess: () => {
                      toast.success('Landed cost posted — item costs updated');
                      setLcOpen(false);
                      setLcDescription('');
                      setLcAmount('');
                    },
                    onError,
                  },
                )
              }
            >
              Post landed cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
