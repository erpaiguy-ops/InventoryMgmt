'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type BankFeedRow,
  type BankTransaction,
} from '@inventory-mgmt/shared-types';
import { ArrowLeft, CheckCircle2, Link2, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
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
import {
  useAccounts,
  useBankAccounts,
  useBankTransactions,
  useCreateBankAccount,
  useCreateBankTransaction,
  useImportBankFeed,
  useMatchBankTransaction,
  useReconcileBankTransaction,
} from '@/hooks/use-financials';
import { usePrincipal } from '@/hooks/use-principal';
import { parseCsv } from '@/lib/csv';

export default function BankingPage() {
  const { data: bankAccounts } = useBankAccounts();
  const { data: accounts } = useAccounts();
  const createBankAccount = useCreateBankAccount();

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const { data: transactions, isLoading } = useBankTransactions(selectedBankAccountId || undefined);
  const createTransaction = useCreateBankTransaction();
  const reconcile = useReconcileBankTransaction();
  const importFeed = useImportBankFeed();
  const matchTxn = useMatchBankTransaction();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.UPDATE);

  const [bankOpen, setBankOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [glAccountId, setGlAccountId] = useState('');

  const [txnOpen, setTxnOpen] = useState(false);
  const [txnBankAccountId, setTxnBankAccountId] = useState('');
  const [txnDate, setTxnDate] = useState('');
  const [txnDescription, setTxnDescription] = useState('');
  const [txnAmount, setTxnAmount] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matchTarget, setMatchTarget] = useState<BankTransaction | null>(null);
  const [matchWithId, setMatchWithId] = useState('');

  const handleImportFile = async (file: File) => {
    if (!selectedBankAccountId) {
      toast.error('Pick a single bank account first (the filter above) to import into');
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error('No data rows found in the file');
      return;
    }
    const parsed: BankFeedRow[] = [];
    for (const r of rows) {
      const txnDate = r.txn_date;
      const description = r.description;
      if (!txnDate || !description || !r.amount) continue;
      parsed.push({
        txnDate,
        description,
        amount: Number(r.amount),
        reference: r.reference || undefined,
      });
    }
    if (parsed.length === 0) {
      toast.error('No valid rows (txn_date, description, amount are required)');
      return;
    }
    importFeed.mutate(
      { bankAccountId: selectedBankAccountId, rows: parsed },
      {
        onSuccess: (result) => toast.success(`Imported ${result.imported} statement line(s)`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
      },
    );
  };

  const candidateMatches = (transactions ?? []).filter(
    (t) =>
      matchTarget &&
      t.id !== matchTarget.id &&
      t.source !== 'feed' &&
      !t.isReconciled &&
      t.bankAccountId === matchTarget.bankAccountId &&
      t.amount === matchTarget.amount,
  );

  const columns: DataTableColumn<BankTransaction>[] = [
    { key: 'date', header: 'Date', render: (t) => t.txnDate },
    { key: 'description', header: 'Description', render: (t) => t.description ?? '—' },
    {
      key: 'amount',
      header: 'Amount',
      render: (t) => (
        <span className={t.amount >= 0 ? 'text-emerald-600' : 'text-destructive'}>
          {t.amount.toFixed(2)}
        </span>
      ),
    },
    { key: 'source', header: 'Source', render: (t) => t.source },
    {
      key: 'status',
      header: 'Status',
      render: (t) =>
        t.isReconciled ? (
          <Badge variant="default">reconciled</Badge>
        ) : (
          <Badge variant="secondary">unreconciled</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => {
        if (!canUpdate || t.isReconciled) return null;
        if (t.source === 'feed') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMatchTarget(t);
                setMatchWithId('');
              }}
            >
              <Link2 className="mr-1 h-3 w-3" /> Match
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              reconcile.mutate(t.id, {
                onSuccess: () => toast.success('Marked reconciled'),
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
              })
            }
          >
            <CheckCircle2 className="mr-1 h-3 w-3" /> Reconcile
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/financials">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Banking</h1>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={importFeed.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
          {canCreate && (
            <Dialog open={bankOpen} onOpenChange={setBankOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> New bank account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New bank account</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Account number</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>GL account</Label>
                    <Select value={glAccountId} onValueChange={setGlAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ledger account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(accounts ?? [])
                          .filter((a) => a.accountType === 'asset')
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={!bankName.trim() || !glAccountId || createBankAccount.isPending}
                    onClick={() =>
                      createBankAccount.mutate(
                        {
                          name: bankName.trim(),
                          accountNumber: accountNumber.trim() || undefined,
                          accountId: glAccountId,
                        },
                        {
                          onSuccess: () => {
                            toast.success('Bank account created');
                            setBankOpen(false);
                            setBankName('');
                            setAccountNumber('');
                            setGlAccountId('');
                          },
                          onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                        },
                      )
                    }
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {canCreate && (
            <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add bank transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Bank account</Label>
                    <Select value={txnBankAccountId} onValueChange={setTxnBankAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(bankAccounts ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={txnDate}
                        onChange={(e) => setTxnDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Amount (+in / -out)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={txnAmount}
                        onChange={(e) => setTxnAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={txnDescription}
                      onChange={(e) => setTxnDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={
                      !txnBankAccountId || !Number(txnAmount) || createTransaction.isPending
                    }
                    onClick={() =>
                      createTransaction.mutate(
                        {
                          bankAccountId: txnBankAccountId,
                          txnDate: txnDate || undefined,
                          description: txnDescription.trim() || undefined,
                          amount: Number(txnAmount),
                        },
                        {
                          onSuccess: () => {
                            toast.success('Transaction recorded');
                            setTxnOpen(false);
                            setTxnDate('');
                            setTxnDescription('');
                            setTxnAmount('');
                          },
                          onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                        },
                      )
                    }
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="w-64 space-y-1">
        <Label>Filter by bank account</Label>
        <Select
          value={selectedBankAccountId || 'all'}
          onValueChange={(v) => setSelectedBankAccountId(v === 'all' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {(bankAccounts ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-muted-foreground text-xs">
        CSV import needs a single bank account selected above, with columns txn_date, description,
        amount, reference (optional). Imported lines land as unreconciled &quot;feed&quot; rows —
        match each one against an existing entry with the same amount, or reconcile it directly if
        there&apos;s nothing to match.
      </p>

      <DataTable
        columns={columns}
        data={transactions ?? []}
        loading={isLoading}
        emptyMessage="No bank transactions yet"
      />

      <Dialog open={matchTarget !== null} onOpenChange={(next) => !next && setMatchTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match &quot;{matchTarget?.description}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Amount {matchTarget?.amount.toFixed(2)} on {matchTarget?.txnDate}
            </p>
            {candidateMatches.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No unreconciled entry with the same amount on this account. Reconcile it directly
                instead if there&apos;s nothing to match.
              </p>
            ) : (
              <div className="space-y-1">
                <Label>Match with</Label>
                <Select value={matchWithId} onValueChange={setMatchWithId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Existing entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateMatches.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.txnDate} — {t.description ?? t.source} ({t.amount.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!matchWithId || matchTxn.isPending}
              onClick={() =>
                matchTarget &&
                matchTxn.mutate(
                  { feedTxnId: matchTarget.id, targetId: matchWithId },
                  {
                    onSuccess: () => {
                      toast.success('Matched and reconciled');
                      setMatchTarget(null);
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  },
                )
              }
            >
              Confirm match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
