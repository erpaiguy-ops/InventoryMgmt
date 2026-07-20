'use client';

import { ACTIONS, hasPermission, MODULES, type JournalEntry } from '@inventory-mgmt/shared-types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccounts, useCreateManualEntry, useJournalEntries } from '@/hooks/use-financials';
import { usePrincipal } from '@/hooks/use-principal';

interface DraftLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export default function JournalEntriesPage() {
  const { data: entries, isLoading } = useJournalEntries();
  const { data: accounts } = useAccounts();
  const createEntry = useCreateManualEntry();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.FINANCIALS, ACTIONS.MANAGE);

  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns: DataTableColumn<JournalEntry>[] = [
    {
      key: 'no',
      header: 'Entry no',
      render: (e) => <span className="font-mono text-xs">{e.entryNo}</span>,
    },
    { key: 'date', header: 'Date', render: (e) => e.entryDate },
    { key: 'source', header: 'Source', render: (e) => e.sourceDocType.replace('_', ' ') },
    { key: 'memo', header: 'Memo', render: (e) => e.memo ?? '—' },
    { key: 'lines', header: 'Lines', render: (e) => e.lines.length },
  ];

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced =
    lines.length >= 2 && Math.abs(totalDebit - totalCredit) < 0.0001 && totalDebit > 0;

  const updateLine = (index: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const resetForm = () => {
    setMemo('');
    setEntryDate('');
    setLines([
      { accountId: '', debit: '', credit: '', description: '' },
      { accountId: '', debit: '', credit: '', description: '' },
    ]);
  };

  const expanded = (entries ?? []).find((e) => e.id === expandedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/financials">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Journal entries</h1>
        </div>
        {canManage && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Manual entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New manual journal entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Memo</Label>
                    <Input
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="What is this for?"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={line.accountId}
                        onValueChange={(v) => updateLine(index, { accountId: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {(accounts ?? []).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} — {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="w-24"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Debit"
                        value={line.debit}
                        onChange={(e) => updateLine(index, { debit: e.target.value, credit: '' })}
                      />
                      <Input
                        className="w-24"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Credit"
                        value={line.credit}
                        onChange={(e) => updateLine(index, { credit: e.target.value, debit: '' })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={lines.length <= 2}
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLines((prev) => [
                          ...prev,
                          { accountId: '', debit: '', credit: '', description: '' },
                        ])
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add line
                    </Button>
                    <span
                      className={`text-sm ${balanced ? 'text-muted-foreground' : 'text-destructive font-medium'}`}
                    >
                      Debit {totalDebit.toFixed(2)} · Credit {totalCredit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!memo.trim() || !balanced || createEntry.isPending}
                  onClick={() =>
                    createEntry.mutate(
                      {
                        entryDate: entryDate || undefined,
                        memo: memo.trim(),
                        lines: lines
                          .filter(
                            (line) =>
                              line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0),
                          )
                          .map((line) => ({
                            accountId: line.accountId,
                            debit: Number(line.debit) || 0,
                            credit: Number(line.credit) || 0,
                          })),
                      },
                      {
                        onSuccess: (entry) => {
                          toast.success(`Entry ${entry.entryNo} posted`);
                          setOpen(false);
                          resetForm();
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Post entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={entries ?? []}
        loading={isLoading}
        emptyMessage="No journal entries yet"
        onRowClick={(entry) => setExpandedId(entry.id === expandedId ? null : entry.id)}
      />

      {expanded && (
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold">
            {expanded.entryNo} — {expanded.memo}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Cost center</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expanded.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {line.costCenterId ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.debit > 0 ? line.debit.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.credit > 0 ? line.credit.toFixed(2) : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
