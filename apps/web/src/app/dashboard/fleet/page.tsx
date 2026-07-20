'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type Vehicle,
  type VehicleDocument,
  type VehicleExpense,
} from '@inventory-mgmt/shared-types';
import { Plus } from 'lucide-react';
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
import { useAccounts } from '@/hooks/use-financials';
import {
  useCreateVehicle,
  useCreateVehicleDocument,
  useCreateVehicleExpense,
  useVehicleDocuments,
  useVehicleExpenses,
  useVehicles,
} from '@/hooks/use-fleet';
import { useEmployees } from '@/hooks/use-hrm';
import { usePrincipal } from '@/hooks/use-principal';

function VehiclesTab() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: employees } = useEmployees();
  const createVehicle = useCreateVehicle();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FLEET, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');
  const [ownership, setOwnership] = useState<Vehicle['ownership']>('owned');
  const [driverEmployeeId, setDriverEmployeeId] = useState('');
  const [capacity, setCapacity] = useState('');

  const drivers = (employees ?? []).filter((e) => e.isDriver && e.status === 'active');

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: 'reg',
      header: 'Reg no',
      render: (v) => <span className="font-mono text-xs">{v.regNo}</span>,
    },
    { key: 'name', header: 'Vehicle', render: (v) => v.name },
    {
      key: 'ownership',
      header: 'Ownership',
      render: (v) => (
        <Badge variant={v.ownership === 'owned' ? 'default' : 'outline'}>{v.ownership}</Badge>
      ),
    },
    { key: 'driver', header: 'Driver', render: (v) => v.driverName ?? '—' },
    {
      key: 'cc',
      header: 'Cost center',
      render: (v) => <span className="font-mono text-xs">{v.costCenterCode ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge variant={v.status === 'active' ? 'default' : 'secondary'}>{v.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vehicles</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Registration no</Label>
                    <Input
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="TX-1234"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Make / model</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Volvo FH"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Ownership</Label>
                    <Select
                      value={ownership}
                      onValueChange={(v) => setOwnership(v as Vehicle['ownership'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owned">Owned</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Driver</Label>
                    <Select
                      value={driverEmployeeId || 'none'}
                      onValueChange={(v) => setDriverEmployeeId(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Capacity</Label>
                  <Input
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="12 tons"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  A dedicated cost center is created automatically — every fuel bill, repair, and
                  the driver&apos;s salary can be traced to this vehicle in the P&amp;L.
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={!regNo.trim() || !name.trim() || createVehicle.isPending}
                  onClick={() =>
                    createVehicle.mutate(
                      {
                        regNo: regNo.trim(),
                        name: name.trim(),
                        ownership,
                        driverEmployeeId: driverEmployeeId || undefined,
                        capacity: capacity.trim() || undefined,
                      },
                      {
                        onSuccess: (vehicle) => {
                          toast.success(`Vehicle ${vehicle.regNo} added`);
                          setOpen(false);
                          setRegNo('');
                          setName('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Add vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={vehicles ?? []}
        loading={isLoading}
        emptyMessage="No vehicles yet"
      />
    </div>
  );
}

function ExpensesTab() {
  const { data: expenses, isLoading } = useVehicleExpenses();
  const { data: vehicles } = useVehicles();
  const { data: accounts } = useAccounts();
  const createExpense = useCreateVehicleExpense();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FLEET, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState<VehicleExpense['expenseType']>('fuel');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [description, setDescription] = useState('');

  const columns: DataTableColumn<VehicleExpense>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (e) => <span className="font-mono text-xs">{e.docNo}</span>,
    },
    { key: 'vehicle', header: 'Vehicle', render: (e) => e.vehicleRegNo ?? '—' },
    {
      key: 'type',
      header: 'Type',
      render: (e) => <Badge variant="outline">{e.expenseType}</Badge>,
    },
    { key: 'date', header: 'Date', render: (e) => e.expenseDate },
    { key: 'amount', header: 'Amount', render: (e) => e.amount.toFixed(2) },
    { key: 'qty', header: 'Qty', render: (e) => e.quantity ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge variant={e.status === 'posted' ? 'default' : 'secondary'}>{e.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Record expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record vehicle expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Vehicle</Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {(vehicles ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.regNo} — {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={expenseType}
                      onValueChange={(v) => setExpenseType(v as VehicleExpense['expenseType'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="rental">Rental</SelectItem>
                        <SelectItem value="toll">Toll</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty (liters)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Odometer</Label>
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      value={odometer}
                      onChange={(e) => setOdometer(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Paid from</Label>
                  <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bank, cash, or payable" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? [])
                        .filter(
                          (a) =>
                            a.systemRole === 'bank' ||
                            a.systemRole === 'cash' ||
                            a.systemRole === 'ap',
                        )
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    !vehicleId || !Number(amount) || !creditAccountId || createExpense.isPending
                  }
                  onClick={() =>
                    createExpense.mutate(
                      {
                        vehicleId,
                        expenseType,
                        amount: Number(amount),
                        quantity: Number(quantity) || undefined,
                        odometer: Number(odometer) || undefined,
                        description: description.trim() || undefined,
                        creditAccountId,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Expense posted to the vehicle cost center');
                          setOpen(false);
                          setAmount('');
                          setQuantity('');
                          setOdometer('');
                          setDescription('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Post expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={expenses ?? []}
        loading={isLoading}
        emptyMessage="No expenses yet"
      />
    </div>
  );
}

function DocumentsTab() {
  const { data: documents, isLoading } = useVehicleDocuments();
  const { data: vehicles } = useVehicles();
  const createDocument = useCreateVehicleDocument();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.FLEET, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [docType, setDocType] = useState<VehicleDocument['docType']>('insurance');
  const [docRef, setDocRef] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const expiryBadge = (doc: VehicleDocument) => {
    if (doc.daysToExpiry === null) return <span className="text-muted-foreground">—</span>;
    if (doc.daysToExpiry < 0) return <Badge variant="destructive">expired</Badge>;
    if (doc.daysToExpiry <= 30)
      return <Badge variant="destructive">{doc.daysToExpiry}d left</Badge>;
    if (doc.daysToExpiry <= 90) return <Badge variant="outline">{doc.daysToExpiry}d left</Badge>;
    return <Badge variant="secondary">{doc.daysToExpiry}d left</Badge>;
  };

  const columns: DataTableColumn<VehicleDocument>[] = [
    { key: 'vehicle', header: 'Vehicle', render: (d) => d.vehicleRegNo ?? '—' },
    { key: 'type', header: 'Document', render: (d) => d.docType },
    { key: 'ref', header: 'Reference', render: (d) => d.docRef ?? '—' },
    { key: 'expiry', header: 'Expiry', render: (d) => d.expiryDate ?? '—' },
    { key: 'radar', header: 'Status', render: (d) => expiryBadge(d) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents &amp; expiry radar</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New vehicle document</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Vehicle</Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {(vehicles ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.regNo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select
                      value={docType}
                      onValueChange={(v) => setDocType(v as VehicleDocument['docType'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registration">Registration</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="permit">Permit</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Reference</Label>
                    <Input value={docRef} onChange={(e) => setDocRef(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!vehicleId || createDocument.isPending}
                  onClick={() =>
                    createDocument.mutate(
                      {
                        vehicleId,
                        docType,
                        docRef: docRef.trim() || undefined,
                        expiryDate: expiryDate || undefined,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Document added');
                          setOpen(false);
                          setDocRef('');
                          setExpiryDate('');
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
      <DataTable
        columns={columns}
        data={(documents ?? []).map((d) => ({ ...d, id: d.id }))}
        loading={isLoading}
        emptyMessage="No documents tracked yet"
      />
    </div>
  );
}

export default function FleetPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fleet &amp; Logistics</h1>
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
