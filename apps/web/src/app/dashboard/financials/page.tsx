'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type Account,
  type CostCenter,
} from '@inventory-mgmt/shared-types';
import { BookText, Building2, Landmark, LineChart, Receipt, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAccounts,
  useCostCenters,
  useCreateAccount,
  useCreateCostCenter,
} from '@/hooks/use-financials';
import { usePrincipal } from '@/hooks/use-principal';

const ACCOUNT_TYPE_VARIANT: Record<Account['accountType'], 'default' | 'secondary' | 'outline'> = {
  asset: 'default',
  liability: 'secondary',
  equity: 'secondary',
  revenue: 'outline',
  expense: 'outline',
};

function AccountsTab() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<Account['accountType']>('expense');
  const [normalBalance, setNormalBalance] = useState<Account['normalBalance']>('debit');

  const columns: DataTableColumn<Account>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (a) => <span className="font-mono text-xs">{a.code}</span>,
    },
    { key: 'name', header: 'Name', render: (a) => a.name },
    {
      key: 'type',
      header: 'Type',
      render: (a) => <Badge variant={ACCOUNT_TYPE_VARIANT[a.accountType]}>{a.accountType}</Badge>,
    },
    { key: 'balance', header: 'Normal balance', render: (a) => a.normalBalance },
    {
      key: 'status',
      header: 'Status',
      render: (a) =>
        a.isSystem ? (
          <Badge variant="secondary">system</Badge>
        ) : a.isActive ? (
          <Badge variant="outline">active</Badge>
        ) : (
          <Badge variant="secondary">inactive</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chart of accounts</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New account</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={accountType}
                      onValueChange={(v) => setAccountType(v as Account['accountType'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Normal balance</Label>
                    <Select
                      value={normalBalance}
                      onValueChange={(v) => setNormalBalance(v as Account['normalBalance'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!code.trim() || !name.trim() || createAccount.isPending}
                  onClick={() =>
                    createAccount.mutate(
                      { code: code.trim(), name: name.trim(), accountType, normalBalance },
                      {
                        onSuccess: () => {
                          toast.success('Account created');
                          setOpen(false);
                          setCode('');
                          setName('');
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
      </div>
      <DataTable
        columns={columns}
        data={accounts ?? []}
        loading={isLoading}
        emptyMessage="No accounts yet"
      />
    </div>
  );
}

function CostCentersTab() {
  const { data: costCenters, isLoading } = useCostCenters();
  const createCostCenter = useCreateCostCenter();
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [centerType, setCenterType] = useState<CostCenter['centerType']>('general');

  const columns: DataTableColumn<CostCenter>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono text-xs">{c.code}</span>,
    },
    { key: 'name', header: 'Name', render: (c) => c.name },
    { key: 'type', header: 'Type', render: (c) => <Badge variant="outline">{c.centerType}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'outline' : 'secondary'}>
          {c.isActive ? 'active' : 'inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cost centers</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add cost center</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New cost center</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="VEH-01"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={centerType}
                    onValueChange={(v) => setCenterType(v as CostCenter['centerType'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!code.trim() || !name.trim() || createCostCenter.isPending}
                  onClick={() =>
                    createCostCenter.mutate(
                      { code: code.trim(), name: name.trim(), centerType },
                      {
                        onSuccess: () => {
                          toast.success('Cost center created');
                          setOpen(false);
                          setCode('');
                          setName('');
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
      </div>
      <DataTable
        columns={columns}
        data={costCenters ?? []}
        loading={isLoading}
        emptyMessage="No cost centers yet"
      />
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Financials</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/journal-entries">
              <BookText className="mr-2 h-4 w-4" /> Journal
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/receipts">
              <Receipt className="mr-2 h-4 w-4" /> Receipts
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/payments">
              <Wallet className="mr-2 h-4 w-4" /> Payments
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/banking">
              <Landmark className="mr-2 h-4 w-4" /> Banking
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/aging">
              <Building2 className="mr-2 h-4 w-4" /> Aging
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/financials/statements">
              <LineChart className="mr-2 h-4 w-4" /> Statements
            </Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Chart of accounts</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost centers</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="cost-centers" className="mt-4">
          <CostCentersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
