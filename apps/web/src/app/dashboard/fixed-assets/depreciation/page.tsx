'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type DepreciationRun,
} from '@inventory-mgmt/shared-types';
import { ArrowLeft, Play } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDepreciationRuns, useDisposals, useRunDepreciation } from '@/hooks/use-fixed-assets';
import { usePrincipal } from '@/hooks/use-principal';

export default function DepreciationPage() {
  const { data: runs, isLoading } = useDepreciationRuns();
  const { data: disposals } = useDisposals();
  const runDepreciation = useRunDepreciation();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.FIXED_ASSETS, ACTIONS.MANAGE);

  const [open, setOpen] = useState(false);
  const [runDate, setRunDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns: DataTableColumn<DepreciationRun>[] = [
    { key: 'date', header: 'Run date', render: (r) => r.runDate },
    { key: 'total', header: 'Total amount', render: (r) => r.totalAmount.toFixed(2) },
    { key: 'lines', header: 'Assets', render: (r) => r.lines.length },
    { key: 'posted', header: 'Posted at', render: (r) => new Date(r.postedAt).toLocaleString() },
  ];

  const expanded = (runs ?? []).find((r) => r.id === expandedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/fixed-assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Depreciation runs</h1>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" /> Run depreciation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Run monthly depreciation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Any date in the month to run</Label>
                  <Input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} />
                </div>
                <p className="text-muted-foreground text-xs">
                  Re-running a month that already ran is safe — it returns the existing run instead
                  of posting twice.
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={!runDate || runDepreciation.isPending}
                  onClick={() =>
                    runDepreciation.mutate(runDate, {
                      onSuccess: (run) => {
                        toast.success(
                          `Depreciation posted: ${run.totalAmount.toFixed(2)} across ${run.lines.length} assets`,
                        );
                        setOpen(false);
                        setRunDate('');
                      },
                      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                    })
                  }
                >
                  Run
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
        emptyMessage="No depreciation runs yet"
        onRowClick={(run) => setExpandedId(run.id === expandedId ? null : run.id)}
      />

      {expanded && (
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold">{expanded.runDate} — per-asset breakdown</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expanded.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{line.assetNo}</span> {line.assetName}
                  </TableCell>
                  <TableCell className="text-right">{line.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Disposals</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Proceeds</TableHead>
              <TableHead className="text-right">Gain / loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(disposals ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <span className="font-mono text-xs">{d.assetNo}</span> {d.assetName}
                </TableCell>
                <TableCell>{d.disposalDate}</TableCell>
                <TableCell className="text-right">{d.proceeds.toFixed(2)}</TableCell>
                <TableCell
                  className={`text-right ${d.gainLoss >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                >
                  {d.gainLoss.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {(disposals ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center">
                  No disposals yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
