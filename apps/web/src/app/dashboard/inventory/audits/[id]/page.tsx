'use client';

import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useReasonCodes } from '@/hooks/use-approvals';
import { useAudit, useEnterCounts, useSubmitAudit } from '@/hooks/use-inventory';
import { usePrincipal } from '@/hooks/use-principal';

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: audit, isLoading } = useAudit(params.id);
  const { data: reasons } = useReasonCodes('stock_audit');
  const enterCounts = useEnterCounts();
  const submitAudit = useSubmitAudit();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canUpdate = hasPermission(permissions, MODULES.INVENTORY, ACTIONS.UPDATE);

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reasonCodeId, setReasonCodeId] = useState('');
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    if (audit) {
      setCounts(
        Object.fromEntries(
          audit.lines.map((line) => [
            line.id,
            line.countedQty != null ? String(line.countedQty) : '',
          ]),
        ),
      );
    }
  }, [audit]);

  if (isLoading || !audit) return <LoadingSpinner />;

  const editable = canUpdate && audit.status === 'counting';

  const saveCounts = () => {
    const payload = Object.entries(counts)
      .filter(([, value]) => value !== '')
      .map(([lineId, value]) => ({ lineId, countedQty: Number(value) }));
    if (payload.length === 0) {
      toast.error('Enter at least one counted quantity');
      return;
    }
    enterCounts.mutate(
      { id: audit.id, counts: payload },
      {
        onSuccess: () => toast.success('Counts saved'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Stock audit {audit.docNo}</h1>
          <Badge variant="outline" className="mt-1">
            {audit.status.replace('_', ' ')}
          </Badge>
        </div>
        {editable && (
          <Button variant="outline" onClick={saveCounts} disabled={enterCounts.isPending}>
            Save counts
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>System qty</TableHead>
              <TableHead className="w-32">Counted qty</TableHead>
              <TableHead>Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.lines.map((line) => {
              const countedRaw = counts[line.id] ?? '';
              const variance = countedRaw === '' ? null : Number(countedRaw) - line.systemQty;
              return (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.itemSku}</TableCell>
                  <TableCell>{line.itemName}</TableCell>
                  <TableCell>{line.batchNo ?? '—'}</TableCell>
                  <TableCell>{line.systemQty}</TableCell>
                  <TableCell>
                    {editable ? (
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={countedRaw}
                        onChange={(e) => setCounts((c) => ({ ...c, [line.id]: e.target.value }))}
                      />
                    ) : (
                      (line.countedQty ?? '—')
                    )}
                  </TableCell>
                  <TableCell>
                    {variance == null ? (
                      '—'
                    ) : (
                      <span
                        className={
                          variance === 0
                            ? 'text-muted-foreground'
                            : variance < 0
                              ? 'text-destructive font-medium'
                              : 'font-medium'
                        }
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {audit.lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  This warehouse had no stock when the audit was created
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editable && audit.lines.length > 0 && (
        <div className="max-w-xl space-y-3 rounded-md border p-4">
          <p className="font-medium">Submit for approval</p>
          <p className="text-muted-foreground text-sm">
            Save your counts first. Variances change stock only after the approval chain&apos;s
            final yes.
          </p>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {(reasons ?? []).map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-reason">Details</Label>
            <Textarea
              id="audit-reason"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
          </div>
          <Button
            disabled={(!reasonCodeId && !reasonText.trim()) || submitAudit.isPending}
            onClick={() =>
              submitAudit.mutate(
                {
                  id: audit.id,
                  reasonCodeId: reasonCodeId || undefined,
                  reasonText: reasonText.trim() || undefined,
                },
                {
                  onSuccess: () => toast.success('Audit submitted for approval'),
                  onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                },
              )
            }
          >
            Submit for approval
          </Button>
        </div>
      )}
    </div>
  );
}
