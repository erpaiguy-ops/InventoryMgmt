'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type Asset,
  type AssetCategory,
} from '@inventory-mgmt/shared-types';
import { Plus, Trash } from 'lucide-react';
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
import { useAccounts } from '@/hooks/use-financials';
import {
  useAssetCategories,
  useAssets,
  useCreateAsset,
  useCreateAssetCategory,
  useDisposeAsset,
} from '@/hooks/use-fixed-assets';
import { usePrincipal } from '@/hooks/use-principal';

const STATUS_VARIANT: Record<Asset['status'], 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  fully_depreciated: 'secondary',
  disposed: 'outline',
};

function CategoriesPanel() {
  const { data: categories, isLoading } = useAssetCategories();
  const createCategory = useCreateAssetCategory();
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.FIXED_ASSETS, ACTIONS.MANAGE);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [defaultMethod, setDefaultMethod] =
    useState<AssetCategory['defaultMethod']>('straight_line');
  const [defaultLifeMonths, setDefaultLifeMonths] = useState('60');
  const [defaultSalvagePct, setDefaultSalvagePct] = useState('0');

  const columns: DataTableColumn<AssetCategory>[] = [
    { key: 'name', header: 'Name', render: (c) => c.name },
    { key: 'method', header: 'Default method', render: (c) => c.defaultMethod.replace('_', ' ') },
    { key: 'life', header: 'Default life (months)', render: (c) => c.defaultLifeMonths },
    { key: 'salvage', header: 'Default salvage %', render: (c) => c.defaultSalvagePct },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Asset categories</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New asset category</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vehicles"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Default method</Label>
                    <Select
                      value={defaultMethod}
                      onValueChange={(v) => setDefaultMethod(v as AssetCategory['defaultMethod'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight-line</SelectItem>
                        <SelectItem value="declining_balance">Declining balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Life (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={defaultLifeMonths}
                      onChange={(e) => setDefaultLifeMonths(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Salvage %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={defaultSalvagePct}
                      onChange={(e) => setDefaultSalvagePct(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!name.trim() || !Number(defaultLifeMonths) || createCategory.isPending}
                  onClick={() =>
                    createCategory.mutate(
                      {
                        name: name.trim(),
                        defaultMethod,
                        defaultLifeMonths: Number(defaultLifeMonths),
                        defaultSalvagePct: Number(defaultSalvagePct) || 0,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Category created');
                          setOpen(false);
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
        data={categories ?? []}
        loading={isLoading}
        emptyMessage="No categories yet"
      />
    </div>
  );
}

function AssetsPanel() {
  const { data: assets, isLoading } = useAssets();
  const { data: categories } = useAssetCategories();
  const { data: accounts } = useAccounts();
  const createAsset = useCreateAsset();
  const disposeAsset = useDisposeAsset();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.FIXED_ASSETS, ACTIONS.MANAGE);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [salvageValue, setSalvageValue] = useState('0');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('60');
  const [method, setMethod] = useState<Asset['method']>('straight_line');
  const [fundingAccountId, setFundingAccountId] = useState('');

  const [disposeTarget, setDisposeTarget] = useState<Asset | null>(null);
  const [disposalDate, setDisposalDate] = useState('');
  const [proceeds, setProceeds] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');

  const columns: DataTableColumn<Asset>[] = [
    {
      key: 'no',
      header: 'Asset no',
      render: (a) => <span className="font-mono text-xs">{a.assetNo}</span>,
    },
    { key: 'name', header: 'Name', render: (a) => a.name },
    { key: 'category', header: 'Category', render: (a) => a.categoryName ?? a.categoryId },
    { key: 'cost', header: 'Cost', render: (a) => a.acquisitionCost.toFixed(2) },
    {
      key: 'accum',
      header: 'Accum. depreciation',
      render: (a) => a.accumulatedDepreciation.toFixed(2),
    },
    { key: 'nbv', header: 'Net book value', render: (a) => a.netBookValue.toFixed(2) },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={STATUS_VARIANT[a.status]}>{a.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (a) =>
        canManage && a.status !== 'disposed' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDisposeTarget(a);
              setDisposalDate('');
              setProceeds('');
              setDepositAccountId('');
            }}
          >
            <Trash className="mr-1 h-3 w-3" /> Dispose
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Asset register</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Register asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Register a fixed asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Delivery van"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select
                      value={categoryId}
                      onValueChange={(v) => {
                        setCategoryId(v);
                        const cat = (categories ?? []).find((c) => c.id === v);
                        if (cat) {
                          setMethod(cat.defaultMethod);
                          setUsefulLifeMonths(String(cat.defaultLifeMonths));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Acquisition date</Label>
                    <Input
                      type="date"
                      value={acquisitionDate}
                      onChange={(e) => setAcquisitionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={acquisitionCost}
                      onChange={(e) => setAcquisitionCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Salvage value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={salvageValue}
                      onChange={(e) => setSalvageValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Useful life (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={usefulLifeMonths}
                      onChange={(e) => setUsefulLifeMonths(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Depreciation method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as Asset['method'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight-line</SelectItem>
                        <SelectItem value="declining_balance">Declining balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Funding account (credit side)</Label>
                  <Select value={fundingAccountId} onValueChange={setFundingAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="e.g. Bank, or Accounts Payable if unpaid" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? [])
                        .filter((a) => a.accountType === 'asset' || a.accountType === 'liability')
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
                  disabled={
                    !name.trim() ||
                    !categoryId ||
                    !Number(acquisitionCost) ||
                    !Number(usefulLifeMonths) ||
                    !fundingAccountId ||
                    createAsset.isPending
                  }
                  onClick={() =>
                    createAsset.mutate(
                      {
                        name: name.trim(),
                        categoryId,
                        acquisitionDate: acquisitionDate || undefined,
                        acquisitionCost: Number(acquisitionCost),
                        salvageValue: Number(salvageValue) || 0,
                        usefulLifeMonths: Number(usefulLifeMonths),
                        method,
                        fundingAccountId,
                      },
                      {
                        onSuccess: (asset) => {
                          toast.success(`Asset ${asset.assetNo} registered`);
                          setOpen(false);
                          setName('');
                          setCategoryId('');
                          setAcquisitionCost('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Register asset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={assets ?? []}
        loading={isLoading}
        emptyMessage="No assets registered yet"
      />

      <Dialog
        open={disposeTarget !== null}
        onOpenChange={(next) => !next && setDisposeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose {disposeTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Net book value: {disposeTarget?.netBookValue.toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Disposal date</Label>
                <Input
                  type="date"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Proceeds</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={proceeds}
                  onChange={(e) => setProceeds(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Deposit proceeds into</Label>
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
          <DialogFooter>
            <Button
              disabled={!disposalDate || !depositAccountId || disposeAsset.isPending}
              onClick={() =>
                disposeTarget &&
                disposeAsset.mutate(
                  {
                    id: disposeTarget.id,
                    disposalDate,
                    proceeds: Number(proceeds) || 0,
                    depositAccountId,
                  },
                  {
                    onSuccess: (disposal) => {
                      toast.success(
                        `Asset disposed — ${disposal.gainLoss >= 0 ? 'gain' : 'loss'} of ${Math.abs(disposal.gainLoss).toFixed(2)}`,
                      );
                      setDisposeTarget(null);
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  },
                )
              }
            >
              Confirm disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FixedAssetsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fixed assets</h1>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/fixed-assets/depreciation">Depreciation &amp; disposals</Link>
        </Button>
      </div>
      <AssetsPanel />
      <CategoriesPanel />
    </div>
  );
}
