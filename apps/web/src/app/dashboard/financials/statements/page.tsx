'use client';

import { type OrgSettings, type ReportRow } from '@inventory-mgmt/shared-types';
import { ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { useBalanceSheet, useCostCenters, useProfitAndLoss } from '@/hooks/use-financials';
import { useOrgSettings } from '@/hooks/use-settings';
import { exportCsv, printLetterheadDocument, tableHtml, type Letterhead } from '@/lib/exports';

function toLetterhead(settings: OrgSettings | undefined): Letterhead {
  return {
    orgName: settings?.orgName ?? 'Company',
    address: settings?.address,
    phone: settings?.phone,
    taxNumber: settings?.taxNumber,
    footer: settings?.documentFooter,
  };
}

function statementRowsToCsv(rows: ReportRow[]): (string | number)[][] {
  return rows.map((r) => [r.code, r.name, r.accountType, r.balance]);
}

function statementHtml(rows: ReportRow[]): string {
  return tableHtml(
    ['Code', 'Account', 'Type', 'Balance'],
    rows.map((r) => [r.code, r.name, r.accountType, r.balance.toFixed(2)]),
    [3],
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const yearStartIso = () => `${new Date().getFullYear()}-01-01`;

function StatementTable({ rows, groupLabel }: { rows: ReportRow[]; groupLabel: string }) {
  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{groupLabel}</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.accountId}>
            <TableCell>
              <span className="font-mono text-xs">{row.code}</span> {row.name}
            </TableCell>
            <TableCell className="text-right">{row.balance.toFixed(2)}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-muted-foreground text-center">
              No accounts
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {rows.length > 0 && (
        <tfoot>
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold">{total.toFixed(2)}</TableCell>
          </TableRow>
        </tfoot>
      )}
    </Table>
  );
}

function BalanceSheetTab() {
  const [asOf, setAsOf] = useState(todayIso());
  const { data: rows, isLoading } = useBalanceSheet(asOf);
  const { data: orgSettings } = useOrgSettings();

  const assets = (rows ?? []).filter((r) => r.accountType === 'asset');
  const liabilities = (rows ?? []).filter((r) => r.accountType === 'liability');
  const equity = (rows ?? []).filter((r) => r.accountType === 'equity');

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="w-48 space-y-1">
          <Label>As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={(rows ?? []).length === 0}
          onClick={() =>
            exportCsv(
              `balance-sheet-${asOf}`,
              ['Code', 'Account', 'Type', 'Balance'],
              statementRowsToCsv(rows ?? []),
            )
          }
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={(rows ?? []).length === 0}
          onClick={() =>
            printLetterheadDocument(
              toLetterhead(orgSettings),
              `Balance Sheet as of ${asOf}`,
              statementHtml(rows ?? []),
            )
          }
        >
          <Printer className="mr-2 h-4 w-4" /> Print / PDF
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Assets</h3>
            <StatementTable rows={assets} groupLabel="Account" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Liabilities</h3>
            <StatementTable rows={liabilities} groupLabel="Account" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Equity</h3>
            <StatementTable rows={equity} groupLabel="Account" />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfitAndLossTab() {
  const [from, setFrom] = useState(yearStartIso());
  const [to, setTo] = useState(todayIso());
  const [costCenterId, setCostCenterId] = useState('');
  const { data: costCenters } = useCostCenters();
  const { data: rows, isLoading } = useProfitAndLoss(from, to, costCenterId || undefined);
  const { data: orgSettings } = useOrgSettings();

  const revenue = (rows ?? []).filter((r) => r.accountType === 'revenue');
  const expense = (rows ?? []).filter((r) => r.accountType === 'expense');
  const netIncome =
    revenue.reduce((sum, r) => sum + r.balance, 0) - expense.reduce((sum, r) => sum + r.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40 space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="w-56 space-y-1">
          <Label>Cost center</Label>
          <Select
            value={costCenterId || 'all'}
            onValueChange={(v) => setCostCenterId(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All cost centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cost centers</SelectItem>
              {(costCenters ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={(rows ?? []).length === 0}
          onClick={() =>
            exportCsv(
              `profit-and-loss-${from}-${to}`,
              ['Code', 'Account', 'Type', 'Balance'],
              statementRowsToCsv(rows ?? []),
            )
          }
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={(rows ?? []).length === 0}
          onClick={() =>
            printLetterheadDocument(
              toLetterhead(orgSettings),
              `Profit & Loss ${from} to ${to}`,
              statementHtml(rows ?? []),
            )
          }
        >
          <Printer className="mr-2 h-4 w-4" /> Print / PDF
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Revenue</h3>
            <StatementTable rows={revenue} groupLabel="Account" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Expense</h3>
            <StatementTable rows={expense} groupLabel="Account" />
          </div>
          <div className="rounded-md border p-3 text-sm font-semibold md:col-span-2">
            Net income: {netIncome.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatementsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" asChild>
          <Link href="/dashboard/financials">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Statements</h1>
      </div>
      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit &amp; loss</TabsTrigger>
          <TabsTrigger value="bs">Balance sheet</TabsTrigger>
        </TabsList>
        <TabsContent value="pl" className="mt-4">
          <ProfitAndLossTab />
        </TabsContent>
        <TabsContent value="bs" className="mt-4">
          <BalanceSheetTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
