'use client';

import type { StockMovement } from '@inventory-mgmt/shared-types';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';

const MOVEMENT_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  purchase: 'success',
  sale: 'default',
  adjustment: 'warning',
  return: 'secondary',
};

interface StockMovementTableProps {
  movements: StockMovement[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function StockMovementTable({ movements, loading, pagination }: StockMovementTableProps) {
  const columns: DataTableColumn<StockMovement>[] = [
    { key: 'createdAt', header: 'Date', render: (m) => formatDate(m.createdAt) },
    {
      key: 'movementType',
      header: 'Type',
      render: (m) => (
        <Badge variant={MOVEMENT_BADGE_VARIANT[m.movementType] ?? 'default'}>
          {m.movementType}
        </Badge>
      ),
    },
    {
      key: 'quantityChange',
      header: 'Change',
      render: (m) => (
        <span className={m.quantityChange >= 0 ? 'text-emerald-600' : 'text-destructive'}>
          {m.quantityChange >= 0 ? '+' : ''}
          {m.quantityChange}
        </span>
      ),
    },
    { key: 'previousQuantity', header: 'Before' },
    { key: 'newQuantity', header: 'After' },
    { key: 'notes', header: 'Notes', render: (m) => m.notes ?? '—' },
  ];

  return (
    <DataTable
      columns={columns}
      data={movements}
      loading={loading}
      emptyMessage="No stock movements recorded."
      pagination={pagination}
    />
  );
}
