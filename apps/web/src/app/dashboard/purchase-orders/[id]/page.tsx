'use client';

import { PurchaseOrderStatus } from '@inventory-mgmt/shared-types';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { OrderItemsTable } from '@/components/orders/order-items-table';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { StatusTimeline } from '@/components/orders/status-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useDeletePurchaseOrderDraft,
  usePurchaseOrder,
  useReceivePurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from '@/hooks/use-orders';
import { useProducts } from '@/hooks/use-products';
import { useSupplier } from '@/hooks/use-suppliers';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/utils/format';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: supplier } = useSupplier(po?.supplierId ?? undefined);
  const { data: productsData } = useProducts({ pageSize: 100 });
  const updateStatus = useUpdatePurchaseOrderStatus();
  const deleteDraft = useDeletePurchaseOrderDraft();
  const receive = useReceivePurchaseOrder();

  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receiveOpen, setReceiveOpen] = useState(false);

  const productById = new Map((productsData?.data ?? []).map((p) => [p.id, p]));

  if (isLoading) return <LoadingSpinner />;
  if (!po) return <p className="text-muted-foreground">Purchase order not found.</p>;

  const openReceiveDialog = () => {
    setReceivedQuantities(
      Object.fromEntries(po.items.map((item) => [item.productId, item.quantity])),
    );
    setReceiveOpen(true);
  };

  const handleReceive = () => {
    receive.mutate(
      {
        id: po.id,
        payload: {
          receivedItems: po.items.map((item) => ({
            productId: item.productId,
            quantityReceived: receivedQuantities[item.productId] ?? item.quantity,
          })),
        },
      },
      {
        onSuccess: () => {
          toast.success('Purchase order received');
          setReceiveOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError ? error.message : 'Failed to receive purchase order',
          );
        },
      },
    );
  };

  const handleStatusChange = (status: 'draft' | 'pending' | 'cancelled') => {
    updateStatus.mutate(
      { id: po.id, status },
      {
        onSuccess: () => toast.success(`Purchase order marked as ${status}`),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : 'Failed to update status');
        },
      },
    );
  };

  const handleDeleteDraft = () => {
    if (!window.confirm(`Delete draft purchase order ${po.poNumber}?`)) return;

    deleteDraft.mutate(po.id, {
      onSuccess: () => {
        toast.success('Draft deleted');
        router.push('/dashboard/purchase-orders');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete draft');
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{po.poNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Ordered {formatDate(po.orderDate)}
            {supplier ? ` from ${supplier.name}` : ''}
          </p>
        </div>
        <OrderStatusBadge status={po.status} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <StatusTimeline steps={['draft', 'pending', 'received']} currentStatus={po.status} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {po.status === PurchaseOrderStatus.DRAFT ? (
          <>
            <Button onClick={() => handleStatusChange('pending')} disabled={updateStatus.isPending}>
              Submit for approval
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDraft}
              disabled={deleteDraft.isPending}
            >
              Delete draft
            </Button>
          </>
        ) : null}
        {po.status === PurchaseOrderStatus.PENDING ? (
          <>
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
              <DialogTrigger asChild>
                <Button onClick={openReceiveDialog}>Receive shipment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Receive {po.poNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4">
                      <Label className="flex-1">
                        {productById.get(item.productId)?.name ?? item.productId} (ordered{' '}
                        {item.quantity})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        className="w-24"
                        value={receivedQuantities[item.productId] ?? item.quantity}
                        onChange={(e) =>
                          setReceivedQuantities((prev) => ({
                            ...prev,
                            [item.productId]: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={handleReceive} disabled={receive.isPending}>
                    {receive.isPending ? 'Receiving...' : 'Confirm receipt'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => handleStatusChange('cancelled')}
              disabled={updateStatus.isPending}
            >
              Cancel order
            </Button>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable
            items={po.items}
            productLabel={(productId) => productById.get(productId)?.name ?? productId}
          />
        </CardContent>
      </Card>

      {po.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{po.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
