'use client';

import { type AuditLogEntry } from '@inventory-mgmt/shared-types';
import { FileSpreadsheet } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuditLog } from '@/hooks/use-reports';
import { exportCsv } from '@/lib/exports';

const METHOD_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  POST: 'default',
  PUT: 'outline',
  PATCH: 'outline',
  DELETE: 'destructive',
};

export default function AuditPage() {
  const { data: entries, isLoading } = useAuditLog();

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'when',
      header: 'When',
      render: (e) => new Date(e.createdAt).toLocaleString(),
    },
    { key: 'actor', header: 'Who', render: (e) => e.actorName ?? '—' },
    {
      key: 'method',
      header: 'Action',
      render: (e) => <Badge variant={METHOD_VARIANT[e.method] ?? 'secondary'}>{e.method}</Badge>,
    },
    { key: 'module', header: 'Module', render: (e) => e.module ?? '—' },
    {
      key: 'path',
      header: 'Endpoint',
      render: (e) => <span className="font-mono text-xs">{e.path}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit trail</h1>
        <Button
          size="sm"
          variant="outline"
          disabled={(entries ?? []).length === 0}
          onClick={() =>
            exportCsv(
              'audit-trail',
              ['When', 'Who', 'Method', 'Module', 'Endpoint'],
              (entries ?? []).map((e) => [e.createdAt, e.actorName, e.method, e.module, e.path]),
            )
          }
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Every change made through the app, by whom and when — append-only, enforced by the database.
        The stock ledger and journal entries are their own immutable records beneath this.
      </p>
      <DataTable
        columns={columns}
        data={entries ?? []}
        loading={isLoading}
        emptyMessage="No activity recorded yet"
      />
    </div>
  );
}
