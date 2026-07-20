'use client';

import { ACTIONS, hasPermission, MODULES, type ArReceipt } from '@inventory-mgmt/shared-types';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
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
import {
  useAccounts,
  useArReceipts,
  useCreateArReceipt,
  usePaymentMethods,
} from '@/hooks/use-financials';
import { usePartners } from '@/hooks/use-partners';
import { usePrincipal } from '@/hooks/use-principal';
import { useSalesInvoices } from '@/hooks/use-sales';

export default function ArReceiptsPage() {
  const { data: receipts, isLoading } = useArReceipts();
  const { data: customersPage } = usePartners({ role: 'customer', pageSize: 100 });
  const { data: invoices } = useSalesInvoices();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: accounts } = useAccounts();
  const createReceipt = useCreateArReceipt();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const customers = customersPage?.data ?? [];
  const openInvoices = useMemo(
    () => (invoices ?? []).filter((inv) => inv.status === 'open' && inv.customerId === customerId),
    [invoices, customerId],
  );

  const columns: DataTableColumn<ArReceipt>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (r) => <span className="font-mono text-xs">{r.docNo}</span>,
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customerName ?? r.customerId },
    { key: 'date', header: 'Date', render: (r) => r.receiptDate },
    { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
    { key: 'allocations', header: 'Invoices allocated', render: (r) => r.allocations.length },
  ];

  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const canSubmit =
    customerId &&
    paymentMethodId &&
    depositAccountId &&
    Number(amount) > 0 &&
    Math.abs(allocatedTotal - Number(amount)) < 0.0001 &&
    !createReceipt.isPending;

  const resetForm = () => {
    setCustomerId('');
    setPaymentMethodId('');
    setDepositAccountId('');
    setAmount('');
    setAllocations({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/financials">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Customer receipts (AR)</h1>
        </div>
        {canCreate && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Record receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record customer receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Customer</Label>
                    <Select
                      value={customerId}
                      onValueChange={(v) => {
                        setCustomerId(v);
                        setAllocations({});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount received</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                {customerId && (
                  <div className="space-y-2">
                    <Label>Allocate against open invoices</Label>
                    {openInvoices.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No open invoices for this customer
                      </p>
                    ) : (
                      openInvoices.map((inv) => {
                        const balance = inv.total - inv.amountPaid;
                        return (
                          <div key={inv.id} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">
                              <span className="font-mono text-xs">{inv.docNo}</span>{' '}
                              <span className="text-muted-foreground">
                                (balance {balance.toFixed(2)})
                              </span>
                            </span>
                            <Input
                              className="w-28"
                              type="number"
                              step="0.01"
                              min={0}
                              max={balance}
                              value={allocations[inv.id] ?? ''}
                              onChange={(e) =>
                                setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))
                              }
                            />
                          </div>
                        );
                      })
                    )}
                    <p className="text-muted-foreground text-xs">
                      Allocated {allocatedTotal.toFixed(2)} of {Number(amount || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  disabled={!canSubmit}
                  onClick={() =>
                    createReceipt.mutate(
                      {
                        customerId,
                        amount: Number(amount),
                        paymentMethodId,
                        depositAccountId,
                        allocations: Object.entries(allocations)
                          .filter(([, v]) => Number(v) > 0)
                          .map(([invoiceId, v]) => ({ invoiceId, amount: Number(v) })),
                      },
                      {
                        onSuccess: (receipt) => {
                          toast.success(`Receipt ${receipt.docNo} posted`);
                          setOpen(false);
                          resetForm();
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Post receipt
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={receipts ?? []}
        loading={isLoading}
        emptyMessage="No receipts yet"
      />
    </div>
  );
}
