'use client';

import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { Lock, ShoppingCart, Trash2, Unlock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
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
import { useAccounts, usePaymentMethods } from '@/hooks/use-financials';
import { useItems } from '@/hooks/use-items';
import { usePartners } from '@/hooks/use-partners';
import {
  useCashDrawerSessions,
  useCloseCashDrawerSession,
  useCreatePosSale,
  useOpenCashDrawerSession,
  usePosSales,
} from '@/hooks/use-pos';
import { usePrincipal } from '@/hooks/use-principal';
import { useWarehouses } from '@/hooks/use-settings';

interface CartLine {
  itemId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export default function PosPage() {
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.POS, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.POS, ACTIONS.UPDATE);

  const { data: sessions } = useCashDrawerSessions();
  const openSession = sessions?.find((s) => s.status === 'open');
  const { data: sales } = usePosSales(openSession?.id);
  const { data: warehouses } = useWarehouses();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: accounts } = useAccounts();
  const { data: customersPage } = usePartners({ role: 'customer', pageSize: 100 });

  const openDrawer = useOpenCashDrawerSession();
  const closeDrawer = useCloseCashDrawerSession();
  const createSale = useCreatePosSale();

  const [openFloat, setOpenFloat] = useState('0');
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');

  const [itemSearch, setItemSearch] = useState('');
  const { data: itemResults } = useItems({ search: itemSearch || undefined, pageSize: 8 });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [customerId, setCustomerId] = useState('');

  const customers = customersPage?.data ?? [];
  const subtotal = cart.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  const addToCart = (item: {
    id: string;
    sku: string;
    name: string;
    standardPrice: number | null;
  }) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          qty: 1,
          unitPrice: item.standardPrice ?? 0,
        },
      ];
    });
    setItemSearch('');
  };

  const resetSaleForm = () => {
    setCart([]);
    setCustomerId('');
  };

  const columns: DataTableColumn<NonNullable<typeof sales>[number]>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (s) => <span className="font-mono text-xs">{s.docNo}</span>,
    },
    { key: 'customer', header: 'Customer', render: (s) => s.customerName ?? 'Walk-in' },
    { key: 'method', header: 'Payment', render: (s) => s.paymentMethodName ?? '—' },
    { key: 'total', header: 'Total', render: (s) => s.total.toFixed(2) },
    { key: 'time', header: 'Time', render: (s) => new Date(s.createdAt).toLocaleTimeString() },
  ];

  if (!openSession) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Point of sale</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> No open cash drawer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Open a drawer session with a starting float to begin ringing up sales.
            </p>
            {canCreate && (
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Button size="sm" onClick={() => setOpenDialog(true)}>
                  <Unlock className="mr-2 h-4 w-4" /> Open drawer
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Open cash drawer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-1">
                    <Label>Opening float</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={openFloat}
                      onChange={(e) => setOpenFloat(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      disabled={openDrawer.isPending}
                      onClick={() =>
                        openDrawer.mutate(
                          { openingFloat: Number(openFloat) || 0 },
                          {
                            onSuccess: () => {
                              toast.success('Drawer opened');
                              setOpenDialog(false);
                            },
                            onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                          },
                        )
                      }
                    >
                      Open
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Point of sale</h1>
        <div className="flex items-center gap-3">
          <Badge variant="default">Drawer open — float {openSession.openingFloat.toFixed(2)}</Badge>
          {canUpdate && (
            <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
              <Button size="sm" variant="outline" onClick={() => setCloseDialog(true)}>
                <Lock className="mr-2 h-4 w-4" /> Close drawer
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close cash drawer</DialogTitle>
                </DialogHeader>
                <div className="space-y-1">
                  <Label>Counted cash</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={countedAmount}
                    onChange={(e) => setCountedAmount(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    disabled={closeDrawer.isPending || !countedAmount}
                    onClick={() =>
                      closeDrawer.mutate(
                        { id: openSession.id, countedAmount: Number(countedAmount) },
                        {
                          onSuccess: (session) => {
                            const diff = session.overShort ?? 0;
                            toast.success(
                              diff === 0
                                ? 'Drawer closed — balanced'
                                : `Drawer closed — ${diff > 0 ? 'over' : 'short'} by ${Math.abs(diff).toFixed(2)}`,
                            );
                            setCloseDialog(false);
                            setCountedAmount('');
                          },
                          onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                        },
                      )
                    }
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ring up sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Search items</Label>
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="SKU or name…"
              />
              {itemSearch && (itemResults?.data ?? []).length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {(itemResults?.data ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                      onClick={() => addToCart(item)}
                    >
                      <span>
                        <span className="font-mono text-xs">{item.sku}</span> {item.name}
                      </span>
                      <span className="text-muted-foreground">
                        {(item.standardPrice ?? 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-28 text-right">Price</TableHead>
                  <TableHead className="w-28 text-right">Line total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((line) => (
                  <TableRow key={line.itemId}>
                    <TableCell>
                      <span className="font-mono text-xs">{line.sku}</span> {line.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="any"
                        min={0.0001}
                        className="w-20 text-right"
                        value={line.qty}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((l) =>
                              l.itemId === line.itemId
                                ? { ...l, qty: Number(e.target.value) || 0 }
                                : l,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-24 text-right"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((l) =>
                              l.itemId === line.itemId
                                ? { ...l, unitPrice: Number(e.target.value) || 0 }
                                : l,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {(line.qty * line.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setCart((prev) => prev.filter((l) => l.itemId !== line.itemId))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cart.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      Search and add items to start a sale
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Customer (optional)</Label>
                <Select
                  value={customerId || 'walkin'}
                  onValueChange={(v) => setCustomerId(v === 'walkin' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment method</Label>
                <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {(paymentMethods ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Deposit into</Label>
                <Select value={depositAccountId} onValueChange={setDepositAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts ?? [])
                      .filter((a) => a.systemRole === 'bank' || a.systemRole === 'cash')
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-semibold">Total: {subtotal.toFixed(2)}</span>
              {canCreate && (
                <Button
                  disabled={
                    cart.length === 0 ||
                    !warehouseId ||
                    !paymentMethodId ||
                    !depositAccountId ||
                    createSale.isPending
                  }
                  onClick={() =>
                    createSale.mutate(
                      {
                        sessionId: openSession.id,
                        customerId: customerId || undefined,
                        warehouseId,
                        paymentMethodId,
                        depositAccountId,
                        lines: cart.map((l) => ({
                          itemId: l.itemId,
                          qty: l.qty,
                          unitPrice: l.unitPrice,
                        })),
                      },
                      {
                        onSuccess: (sale) => {
                          toast.success(`Sale ${sale.docNo} completed — ${sale.total.toFixed(2)}`);
                          resetSaleForm();
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  <ShoppingCart className="mr-2 h-4 w-4" /> Complete sale
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">This session</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={sales ?? []}
              loading={false}
              emptyMessage="No sales yet this session"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
