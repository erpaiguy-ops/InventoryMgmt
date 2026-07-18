'use client';

import type { Supplier } from '@inventory-mgmt/shared-types';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { SearchBar } from '@/components/common/search-bar';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteSupplier, useSuppliers } from '@/hooks/use-suppliers';
import { ApiError } from '@/services/api-client';

const PAGE_SIZE = 20;

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSuppliers({ search, page, pageSize: PAGE_SIZE });
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = (supplier: Supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;

    deleteSupplier.mutate(supplier.id, {
      onSuccess: () => toast.success('Supplier deleted'),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete supplier');
      },
    });
  };

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact', render: (s) => s.contactPerson ?? '—' },
    { key: 'email', header: 'Email', render: (s) => s.email ?? '—' },
    { key: 'phone', header: 'Phone', render: (s) => s.phone ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex items-center gap-3">
          <SupplierFormDialog
            supplier={s}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" onClick={() => handleDelete(s)}>
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <SupplierFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          }
        />
      </div>

      <SearchBar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Search suppliers..."
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No suppliers yet."
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
