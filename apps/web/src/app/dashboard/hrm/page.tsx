'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type Employee,
  type LeaveBalance,
  type LeaveRequest,
  type PayrollRun,
} from '@inventory-mgmt/shared-types';
import { Banknote, Plus } from 'lucide-react';
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
import { useAccounts, useCostCenters } from '@/hooks/use-financials';
import {
  useCreateEmployee,
  useCreateLeaveRequest,
  useEmployees,
  useLeaveBalances,
  useLeaveRequests,
  useLeaveTypes,
  usePayPayrollRun,
  usePayrollRuns,
  useRunPayroll,
  useUpdateEmployee,
} from '@/hooks/use-hrm';
import { usePrincipal } from '@/hooks/use-principal';

const LEAVE_STATUS_VARIANT: Record<
  LeaveRequest['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending_approval: 'outline',
  approved: 'default',
  rejected: 'destructive',
  cancelled: 'secondary',
};

function EmployeesTab() {
  const { data: employees, isLoading } = useEmployees();
  const { data: costCenters } = useCostCenters();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.HRM, ACTIONS.CREATE);
  const canUpdate = hasPermission(permissions, MODULES.HRM, ACTIONS.UPDATE);

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [isDriver, setIsDriver] = useState(false);
  const [costCenterId, setCostCenterId] = useState('');

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'no',
      header: 'Emp no',
      render: (e) => <span className="font-mono text-xs">{e.empNo}</span>,
    },
    { key: 'name', header: 'Name', render: (e) => e.fullName },
    { key: 'dept', header: 'Department', render: (e) => e.department ?? '—' },
    { key: 'desig', header: 'Designation', render: (e) => e.designation ?? '—' },
    {
      key: 'driver',
      header: 'Driver',
      render: (e) => (e.isDriver ? <Badge variant="outline">driver</Badge> : '—'),
    },
    { key: 'net', header: 'Net salary', render: (e) => e.netSalary.toFixed(2) },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge variant={e.status === 'active' ? 'default' : 'secondary'}>{e.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (e) =>
        canUpdate ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateEmployee.mutate(
                { id: e.id, status: e.status === 'active' ? 'inactive' : 'active' },
                {
                  onSuccess: () => toast.success('Employee updated'),
                  onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
                },
              )
            }
          >
            {e.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Employees</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Designation</Label>
                    <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <input
                      id="is-driver"
                      type="checkbox"
                      className="accent-primary h-4 w-4"
                      checked={isDriver}
                      onChange={(e) => setIsDriver(e.target.checked)}
                    />
                    <Label htmlFor="is-driver">Is a driver</Label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Basic salary</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Allowances</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={allowances}
                      onChange={(e) => setAllowances(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Deductions</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Cost center (drivers: pick the vehicle)</Label>
                  <Select
                    value={costCenterId || 'none'}
                    onValueChange={(v) => setCostCenterId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (general)</SelectItem>
                      {(costCenters ?? []).map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} — {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!fullName.trim() || !Number(basicSalary) || createEmployee.isPending}
                  onClick={() =>
                    createEmployee.mutate(
                      {
                        fullName: fullName.trim(),
                        department: department.trim() || undefined,
                        designation: designation.trim() || undefined,
                        isDriver,
                        basicSalary: Number(basicSalary),
                        allowances: Number(allowances) || 0,
                        deductions: Number(deductions) || 0,
                        costCenterId: costCenterId || undefined,
                      },
                      {
                        onSuccess: (employee) => {
                          toast.success(`Employee ${employee.empNo} created`);
                          setOpen(false);
                          setFullName('');
                          setBasicSalary('');
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
        data={employees ?? []}
        loading={isLoading}
        emptyMessage="No employees yet"
      />
    </div>
  );
}

function LeaveTab() {
  const { data: requests, isLoading } = useLeaveRequests();
  const { data: balances } = useLeaveBalances();
  const { data: employees } = useEmployees();
  const { data: leaveTypes } = useLeaveTypes();
  const createRequest = useCreateLeaveRequest();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.HRM, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [days, setDays] = useState('');
  const [reasonText, setReasonText] = useState('');

  const columns: DataTableColumn<LeaveRequest>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (r) => <span className="font-mono text-xs">{r.docNo}</span>,
    },
    { key: 'employee', header: 'Employee', render: (r) => r.employeeName ?? r.employeeId },
    { key: 'type', header: 'Type', render: (r) => r.leaveTypeName ?? '—' },
    { key: 'period', header: 'Period', render: (r) => `${r.fromDate} → ${r.toDate}` },
    { key: 'days', header: 'Days', render: (r) => r.days },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={LEAVE_STATUS_VARIANT[r.status]}>{r.status.replace('_', ' ')}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leave requests</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Request leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New leave request</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Employee</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {(employees ?? [])
                          .filter((e) => e.status === 'active')
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.empNo} — {e.fullName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Leave type</Label>
                    <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(leaveTypes ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>To</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Days</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0.5}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    rows={2}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Leave requests go to the Approvals inbox — nothing is approved automatically.
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    !employeeId ||
                    !leaveTypeId ||
                    !fromDate ||
                    !toDate ||
                    !Number(days) ||
                    createRequest.isPending
                  }
                  onClick={() =>
                    createRequest.mutate(
                      {
                        employeeId,
                        leaveTypeId,
                        fromDate,
                        toDate,
                        days: Number(days),
                        reasonText: reasonText.trim() || undefined,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Leave request submitted for approval');
                          setOpen(false);
                          setEmployeeId('');
                          setFromDate('');
                          setToDate('');
                          setDays('');
                          setReasonText('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Submit for approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={requests ?? []}
        loading={isLoading}
        emptyMessage="No leave requests yet"
      />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Leave balances</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(balances ?? []).map((b: LeaveBalance) => (
              <TableRow key={b.id}>
                <TableCell>{b.employeeName ?? b.employeeId}</TableCell>
                <TableCell>{b.leaveTypeName ?? '—'}</TableCell>
                <TableCell>{b.year}</TableCell>
                <TableCell className="text-right">{b.allocated.toFixed(1)}</TableCell>
                <TableCell className="text-right">{b.used.toFixed(1)}</TableCell>
                <TableCell className="text-right font-medium">{b.remaining.toFixed(1)}</TableCell>
              </TableRow>
            ))}
            {(balances ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  No paid leave taken yet — balances appear once a request is approved.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PayrollTab() {
  const { data: runs, isLoading } = usePayrollRuns();
  const { data: accounts } = useAccounts();
  const runPayroll = useRunPayroll();
  const payRun = usePayPayrollRun();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.HRM, ACTIONS.MANAGE);

  const [open, setOpen] = useState(false);
  const [runMonth, setRunMonth] = useState('');
  const [payTarget, setPayTarget] = useState<PayrollRun | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns: DataTableColumn<PayrollRun>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (r) => <span className="font-mono text-xs">{r.docNo}</span>,
    },
    { key: 'month', header: 'Month', render: (r) => r.runMonth.slice(0, 7) },
    { key: 'gross', header: 'Gross', render: (r) => r.totalGross.toFixed(2) },
    { key: 'deductions', header: 'Deductions', render: (r) => r.totalDeductions.toFixed(2) },
    { key: 'net', header: 'Net', render: (r) => r.totalNet.toFixed(2) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge
          variant={
            r.status === 'paid' ? 'default' : r.status === 'posted' ? 'outline' : 'secondary'
          }
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        canManage && r.status === 'posted' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setPayTarget(r);
              setSourceAccountId('');
            }}
          >
            <Banknote className="mr-1 h-3 w-3" /> Pay
          </Button>
        ) : null,
    },
  ];

  const expanded = (runs ?? []).find((r) => r.id === expandedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Run payroll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Run monthly payroll</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={runMonth}
                    onChange={(e) => setRunMonth(e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Snapshots every active employee&apos;s salary into payslips and posts salary
                  expense to the ledger — driver salaries land on their vehicle&apos;s cost center.
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={!runMonth || runPayroll.isPending}
                  onClick={() =>
                    runPayroll.mutate(
                      { runMonth: `${runMonth}-01` },
                      {
                        onSuccess: (run) => {
                          toast.success(
                            `Payroll ${run.docNo} posted — net ${run.totalNet.toFixed(2)}`,
                          );
                          setOpen(false);
                          setRunMonth('');
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Run &amp; post
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={runs ?? []}
        loading={isLoading}
        emptyMessage="No payroll runs yet"
        onRowClick={(run) => setExpandedId(run.id === expandedId ? null : run.id)}
      />

      {expanded && (
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {expanded.docNo} — payslips for {expanded.runMonth.slice(0, 7)}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expanded.payslips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{slip.empNo}</span> {slip.employeeName}
                  </TableCell>
                  <TableCell className="text-right">{slip.basic.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{slip.allowances.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{slip.deductions.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{slip.netPay.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={payTarget !== null} onOpenChange={(next) => !next && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {payTarget?.docNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Net to pay: {payTarget?.totalNet.toFixed(2)}
            </p>
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
          <DialogFooter>
            <Button
              disabled={!sourceAccountId || payRun.isPending}
              onClick={() =>
                payTarget &&
                payRun.mutate(
                  { id: payTarget.id, sourceAccountId },
                  {
                    onSuccess: () => {
                      toast.success('Payroll paid');
                      setPayTarget(null);
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                  },
                )
              }
            >
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HrmPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">HRM &amp; Payroll</h1>
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4">
          <EmployeesTab />
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeaveTab />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
