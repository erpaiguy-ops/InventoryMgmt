'use client';

import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePrincipal } from '@/hooks/use-principal';
import {
  useCreateNumberingSeries,
  useCreateTax,
  useCreateUom,
  useCreateWarehouse,
  useDeleteTax,
  useDeleteUom,
  useDeleteWarehouse,
  useNumberingSeries,
  useOrgSettings,
  useTaxes,
  useUoms,
  useUpdateNumberingSeries,
  useUpdateOrgSettings,
  useWarehouses,
} from '@/hooks/use-settings';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function TaxesTab({ canManage }: { canManage: boolean }) {
  const { data: taxes, isLoading } = useTaxes();
  const createTax = useCreateTax();
  const deleteTax = useDeleteTax();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add tax
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New tax</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="tax-name">Name</Label>
                <Input
                  id="tax-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VAT 5%"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tax-rate">Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.001"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!name || rate === '' || createTax.isPending}
                onClick={() => {
                  createTax.mutate(
                    { name, rate: Number(rate) },
                    {
                      onSuccess: () => {
                        toast.success('Tax created');
                        setOpen(false);
                        setName('');
                        setRate('');
                      },
                      onError: (e) => toast.error(errorMessage(e)),
                    },
                  );
                }}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(taxes ?? []).map((tax) => (
              <TableRow key={tax.id}>
                <TableCell>{tax.name}</TableCell>
                <TableCell>{tax.rate}%</TableCell>
                <TableCell>{tax.isActive ? 'Active' : 'Inactive'}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteTax.mutate(tax.id, {
                          onSuccess: () => toast.success('Tax deleted'),
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(taxes ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center">
                  No taxes configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UomsTab({ canManage }: { canManage: boolean }) {
  const { data: uoms, isLoading } = useUoms();
  const createUom = useCreateUom();
  const deleteUom = useDeleteUom();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New unit of measure</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="uom-code">Code</Label>
                <Input
                  id="uom-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PCS"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uom-name">Name</Label>
                <Input
                  id="uom-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Piece"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!code || !name || createUom.isPending}
                onClick={() =>
                  createUom.mutate(
                    { code, name },
                    {
                      onSuccess: () => {
                        toast.success('Unit created');
                        setOpen(false);
                        setCode('');
                        setName('');
                      },
                      onError: (e) => toast.error(errorMessage(e)),
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              {canManage && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(uoms ?? []).map((uom) => (
              <TableRow key={uom.id}>
                <TableCell className="font-mono">{uom.code}</TableCell>
                <TableCell>{uom.name}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteUom.mutate(uom.id, {
                          onSuccess: () => toast.success('Unit deleted'),
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WarehousesTab({ canManage }: { canManage: boolean }) {
  const { data: warehouses, isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New warehouse</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="wh-code">Code</Label>
                <Input
                  id="wh-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="MAIN"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wh-name">Name</Label>
                <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wh-address">Address</Label>
                <Textarea
                  id="wh-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!code || !name || createWarehouse.isPending}
                onClick={() =>
                  createWarehouse.mutate(
                    { code, name, address: address || undefined },
                    {
                      onSuccess: () => {
                        toast.success('Warehouse created');
                        setOpen(false);
                        setCode('');
                        setName('');
                        setAddress('');
                      },
                      onError: (e) => toast.error(errorMessage(e)),
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              {canManage && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(warehouses ?? []).map((warehouse) => (
              <TableRow key={warehouse.id}>
                <TableCell className="font-mono">{warehouse.code}</TableCell>
                <TableCell>{warehouse.name}</TableCell>
                <TableCell className="text-muted-foreground">{warehouse.address ?? '—'}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteWarehouse.mutate(warehouse.id, {
                          onSuccess: () => toast.success('Warehouse deleted'),
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NumberingTab({ canManage }: { canManage: boolean }) {
  const { data: series, isLoading } = useNumberingSeries();
  const updateSeries = useUpdateNumberingSeries();
  const createSeries = useCreateNumberingSeries();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState('');
  const [prefix, setPrefix] = useState('');

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add series
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New numbering series</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ns-doctype">Document type (snake_case)</Label>
                <Input
                  id="ns-doctype"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="custom_doc"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ns-prefix">Prefix</Label>
                <Input
                  id="ns-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="DOC-"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!docType || !prefix || createSeries.isPending}
                onClick={() =>
                  createSeries.mutate(
                    { docType, prefix },
                    {
                      onSuccess: () => {
                        toast.success('Series created');
                        setOpen(false);
                        setDocType('');
                        setPrefix('');
                      },
                      onError: (e) => toast.error(errorMessage(e)),
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document type</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Next number</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(series ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.docType}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Input
                      className="h-8 w-24"
                      defaultValue={row.prefix}
                      onBlur={(e) => {
                        if (e.target.value !== row.prefix) {
                          updateSeries.mutate(
                            { id: row.id, prefix: e.target.value },
                            {
                              onSuccess: () => toast.success('Prefix updated'),
                              onError: (err) => toast.error(errorMessage(err)),
                            },
                          );
                        }
                      }}
                    />
                  ) : (
                    row.prefix
                  )}
                </TableCell>
                <TableCell>{row.nextNumber}</TableCell>
                <TableCell className="text-muted-foreground font-mono">
                  {row.prefix}
                  {String(row.nextNumber).padStart(row.padding, '0')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrgTab({ canManage }: { canManage: boolean }) {
  const { data: settings, isLoading } = useOrgSettings();
  const updateSettings = useUpdateOrgSettings();
  const [currency, setCurrency] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState('1');
  const [footer, setFooter] = useState('');

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setFiscalMonth(String(settings.fiscalYearStartMonth));
      setFooter(settings.documentFooter ?? '');
    }
  }, [settings]);

  if (isLoading || !settings) return <LoadingSpinner />;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">Organization defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="org-currency">Currency</Label>
          <Input
            id="org-currency"
            value={currency}
            disabled={!canManage}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-fym">Fiscal year start month (1–12)</Label>
          <Input
            id="org-fym"
            type="number"
            min={1}
            max={12}
            value={fiscalMonth}
            disabled={!canManage}
            onChange={(e) => setFiscalMonth(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-footer">Document footer</Label>
          <Textarea
            id="org-footer"
            value={footer}
            disabled={!canManage}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="Shown at the bottom of printed documents"
          />
        </div>
        {canManage && (
          <Button
            disabled={updateSettings.isPending}
            onClick={() =>
              updateSettings.mutate(
                {
                  currency,
                  fiscalYearStartMonth: Number(fiscalMonth),
                  documentFooter: footer,
                },
                {
                  onSuccess: () => toast.success('Settings saved'),
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          >
            Save
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.SETTINGS, ACTIONS.MANAGE);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Tabs defaultValue="taxes">
        <TabsList>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="uoms">Units</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="org">Organization</TabsTrigger>
        </TabsList>
        <TabsContent value="taxes">
          <TaxesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="uoms">
          <UomsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="numbering">
          <NumberingTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="org">
          <OrgTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
