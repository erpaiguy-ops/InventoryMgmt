'use client';

import { ACTIONS, hasPermission, MODULES, type StockAudit } from '@inventory-mgmt/shared-types';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudits, useCreateAudit } from '@/hooks/use-inventory';
import { usePrincipal } from '@/hooks/use-principal';
import { useWarehouses } from '@/hooks/use-settings';

const STATUS_VARIANT: Record<
  StockAudit['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  counting: 'secondary',
  pending_approval: 'outline',
  posted: 'default',
  rejected: 'destructive',
};

export default function AuditsPage() {
  const router = useRouter();
  const { data: audits, isLoading } = useAudits();
  const { data: warehouses } = useWarehouses();
  const createAudit = useCreateAudit();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.CREATE);

  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');

  const warehouseCode = (id: string) => (warehouses ?? []).find((w) => w.id === id)?.code ?? id;

  const columns: DataTableColumn<StockAudit>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (a) => <span className="font-mono text-xs">{a.docNo}</span>,
    },
    { key: 'warehouse', header: 'Warehouse', render: (a) => warehouseCode(a.warehouseId) },
    { key: 'lines', header: 'Count lines', render: (a) => a.lines.length },
    {
      key: 'counted',
      header: 'Counted',
      render: (a) =>
        `${a.lines.filter((line) => line.countedQty != null).length}/${a.lines.length}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={STATUS_VARIANT[a.status]}>{a.status.replace('_', ' ')}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock audits</h1>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New audit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a stock audit</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-sm">
                A count sheet is created from the current system quantities of the chosen warehouse.
                Enter physical counts, then submit — variances post only after approval, as{' '}
                <span className="font-mono text-xs">stock-audit</span> movements.
              </p>
              <div className="space-y-1">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Warehouse to count" />
                  </SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} — {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  disabled={!warehouseId || createAudit.isPending}
                  onClick={() =>
                    createAudit.mutate(
                      { warehouseId },
                      {
                        onSuccess: (audit) => {
                          toast.success(`Audit ${audit.docNo} started`);
                          setOpen(false);
                          router.push(`/dashboard/inventory/audits/${audit.id}`);
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                      },
                    )
                  }
                >
                  Start audit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable
        columns={columns}
        data={audits ?? []}
        loading={isLoading}
        emptyMessage="No stock audits yet"
        onRowClick={(audit) => router.push(`/dashboard/inventory/audits/${audit.id}`)}
      />
    </div>
  );
}
