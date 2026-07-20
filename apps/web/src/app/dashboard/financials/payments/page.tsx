'use client';

import { ACTIONS, hasPermission, MODULES, type ApPayment } from '@inventory-mgmt/shared-types';
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
  useApPayments,
  useCreateApPayment,
  usePaymentMethods,
} from '@/hooks/use-financials';
import { usePartners } from '@/hooks/use-partners';
import { usePrincipal } from '@/hooks/use-principal';
import { usePurchaseBills } from '@/hooks/use-procurement';

export default function ApPaymentsPage() {
  const { data: payments, isLoading } = useApPayments();
  const { data: suppliersPage } = usePartners({ role: 'supplier', pageSize: 100 });
  const { data: bills } = usePurchaseBills();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: accounts } = useAccounts();
  const createPayment = useCreateApPayment();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const suppliers = suppliersPage?.data ?? [];
  const openBills = useMemo(
    () => (bills ?? []).filter((b) => b.status === 'open' && b.supplierId === supplierId),
    [bills, supplierId],
  );

  const columns: DataTableColumn<ApPayment>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (p) => <span className="font-mono text-xs">{p.docNo}</span>,
    },
    { key: 'supplier', header: 'Supplier', render: (p) => p.supplierName ?? p.supplierId },
    { key: 'date', header: 'Date', render: (p) => p.paymentDate },
    { key: 'amount', header: 'Amount', render: (p) => Number(p.amount).toFixed(2) },
    { key: 'allocations', header: 'Bills allocated', render: (p) => p.allocations.length },
  ];

  const allocatedTotal = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const canSubmit =
    supplierId &&
    paymentMethodId &&
    sourceAccountId &&
    Number(amount) > 0 &&
    Math.abs(allocatedTotal - Number(amount)) < 0.0001 &&
    !createPayment.isPending;

  const resetForm = () => {
    setSupplierId('');
    setPaymentMethodId('');
    setSourceAccountId('');
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
          <h1 className="text-2xl font-semibold">Supplier payments (AP)</h1>
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
                <Plus className="mr-2 h-4 w-4" /> Record payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record supplier payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Supplier</Label>
                    <Select
                      value={supplierId}
                      onValueChange={(v) => {
                        setSupplierId(v);
                        setAllocations({});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount paid</Label>
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
                    <Label>Pay from</Label>
                    <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
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
                {supplierId && (
                  <div className="space-y-2">
                    <Label>Allocate against open bills</Label>
                    {openBills.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No open bills for this supplier
                      </p>
                    ) : (
                      openBills.map((bill) => {
                        const balance = bill.total - bill.amountPaid;
                        return (
                          <div key={bill.id} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">
                              <span className="font-mono text-xs">{bill.docNo}</span>{' '}
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
                              value={allocations[bill.id] ?? ''}
                              onChange={(e) =>
                                setAllocations((prev) => ({ ...prev, [bill.id]: e.target.value }))
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
                    createPayment.mutate(
                      {
                        supplierId,
                        amount: Number(amount),
                        paymentMethodId,
                        sourceAccountId,
                        allocations: Object.entries(allocations)
                          .filter(([, v]) => Number(v) > 0)
                          .map(([billId, v]) => ({ billId, amount: Number(v) })),
                      },
                      {
                        onSuccess: (payment) => {
                          toast.success(`Payment ${payment.docNo} posted`);
                          setOpen(false);
                          resetForm();
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Post payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={payments ?? []}
        loading={isLoading}
        emptyMessage="No payments yet"
      />
    </div>
  );
}
