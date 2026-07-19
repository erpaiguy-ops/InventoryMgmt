'use client';

import { ACTIONS, hasPermission, MODULES, type Item } from '@inventory-mgmt/shared-types';
import { Download, FolderTree, Plus, Tags, Upload } from 'lucide-react';
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
import { useBulkCreateItems, useItemCategories, useItems } from '@/hooks/use-items';
import { usePrincipal } from '@/hooks/use-principal';
import { useUoms } from '@/hooks/use-settings';
import { downloadCsvTemplate, parseCsv } from '@/lib/csv';
import type { ItemPayload } from '@/services/items.service';

const ALL = '__all__';
const CSV_HEADERS = [
  'sku',
  'name',
  'description',
  'base_uom_code',
  'standard_cost',
  'standard_price',
];

export default function ItemsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.ITEMS, ACTIONS.CREATE);

  const { data, isLoading } = useItems({
    search: search || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    page,
    pageSize: 20,
  });
  const { data: categories } = useItemCategories();
  const { data: uoms } = useUoms();
  const bulkCreate = useBulkCreateItems();

  const categoryName = (id: string | null) =>
    (categories ?? []).find((c) => c.id === id)?.name ?? '—';

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error('No data rows found in the file');
      return;
    }

    const uomByCode = new Map((uoms ?? []).map((u) => [u.code.toUpperCase(), u.id]));
    const items: ItemPayload[] = [];
    const problems: string[] = [];

    rows.forEach((row, index) => {
      const uomId = uomByCode.get((row.base_uom_code || 'PCS').toUpperCase());
      if (!row.name) {
        problems.push(`Row ${index + 2}: missing name`);
        return;
      }
      if (!uomId) {
        problems.push(`Row ${index + 2}: unknown unit code "${row.base_uom_code}"`);
        return;
      }
      items.push({
        sku: row.sku || undefined,
        name: row.name,
        description: row.description || undefined,
        baseUomId: uomId,
        standardCost: row.standard_cost ? Number(row.standard_cost) : undefined,
        standardPrice: row.standard_price ? Number(row.standard_price) : undefined,
      });
    });

    if (problems.length > 0) {
      toast.error(`${problems.length} row(s) skipped — ${problems[0]}`);
    }
    if (items.length === 0) return;

    bulkCreate.mutate(items, {
      onSuccess: (result) => toast.success(`Imported ${result.created} item(s)`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
    });
  };

  const columns: DataTableColumn<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (item) => <span className="font-mono text-xs">{item.sku}</span>,
    },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (item) => categoryName(item.categoryId) },
    {
      key: 'tracking',
      header: 'Tracking',
      render: (item) =>
        item.tracking === 'none' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge variant="outline">
            {item.tracking}
            {item.trackExpiry ? ' + expiry' : ''}
          </Badge>
        ),
    },
    {
      key: 'price',
      header: 'Std. price',
      render: (item) => (item.standardPrice != null ? item.standardPrice.toFixed(2) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Items</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/items/categories">
              <FolderTree className="mr-2 h-4 w-4" /> Categories
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/items/price-lists">
              <Tags className="mr-2 h-4 w-4" /> Price lists
            </Link>
          </Button>
          {canCreate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsvTemplate('items-template.csv', CSV_HEADERS)}
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
                <Link href="/dashboard/items/create">
                  <Plus className="mr-2 h-4 w-4" /> New item
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or SKU"
        />
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No items yet — create one or import a CSV"
        onRowClick={(item) => router.push(`/dashboard/items/${item.id}`)}
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
