'use client';

import { ACTIONS, hasPermission, MODULES, type Partner } from '@inventory-mgmt/shared-types';
import { Download, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { SearchBar } from '@/components/common/search-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkCreatePartners, usePartners } from '@/hooks/use-partners';
import { usePrincipal } from '@/hooks/use-principal';
import { downloadCsvTemplate, parseCsv } from '@/lib/csv';
import type { PartnerPayload } from '@/services/partners.service';

const ALL = '__all__';
const CSV_HEADERS = ['code', 'name', 'role', 'email', 'phone', 'tax_id'];

export default function PartnersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(ALL);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.PARTNERS, ACTIONS.CREATE);

  const { data, isLoading } = usePartners({
    search: search || undefined,
    role: role === ALL ? undefined : (role as 'customer' | 'supplier'),
    page,
    pageSize: 20,
  });
  const bulkCreate = useBulkCreatePartners();

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error('No data rows found in the file');
      return;
    }

    const partners: PartnerPayload[] = [];
    for (const row of rows) {
      const name = row.name;
      if (!name) continue;
      partners.push({
        code: row.code || undefined,
        name,
        isCustomer: row.role !== 'supplier',
        isSupplier: row.role === 'supplier' || row.role === 'both',
        email: row.email || undefined,
        phone: row.phone || undefined,
        taxIdNumber: row.tax_id || undefined,
      });
    }

    if (partners.length === 0) {
      toast.error('No valid rows (name is required)');
      return;
    }

    bulkCreate.mutate(partners, {
      onSuccess: (result) => toast.success(`Imported ${result.created} partner(s)`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
    });
  };

  const columns: DataTableColumn<Partner>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (partner) => <span className="font-mono text-xs">{partner.code ?? '—'}</span>,
    },
    { key: 'name', header: 'Name' },
    {
      key: 'role',
      header: 'Role',
      render: (partner) => (
        <div className="flex gap-1">
          {partner.isCustomer && <Badge variant="outline">customer</Badge>}
          {partner.isSupplier && <Badge variant="outline">supplier</Badge>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (partner) => partner.email ?? partner.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (partner) => (
        <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
          {partner.status.replace('_', ' ')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Partners</h1>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsvTemplate('partners-template.csv', CSV_HEADERS)}
            >
              <Download className="mr-2 h-4 w-4" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkCreate.isPending}
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
            <Button size="sm" asChild>
              <Link href="/dashboard/partners/create">
                <Plus className="mr-2 h-4 w-4" /> New partner
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name, code, or email"
        />
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No partners yet — create one or import a CSV"
        onRowClick={(partner) => router.push(`/dashboard/partners/${partner.id}`)}
        pagination={
          data
            ? {
                page: data.meta.page,
                pageSize: data.meta.pageSize,
                totalItems: data.meta.totalItems,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
