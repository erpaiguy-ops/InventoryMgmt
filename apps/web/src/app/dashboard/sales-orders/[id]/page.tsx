'use client';

import { SalesOrderStatus } from '@inventory-mgmt/shared-types';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { OrderItemsTable } from '@/components/orders/order-items-table';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { StatusTimeline } from '@/components/orders/status-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCancelSalesOrder,
  useConfirmSalesOrder,
  useDeleteSalesOrderDraft,
  useDeliverSalesOrder,
  useSalesOrder,
  useShipSalesOrder,
} from '@/hooks/use-orders';
import { useProducts } from '@/hooks/use-products';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/utils/format';

const CANCELLABLE_STATUSES: string[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.SHIPPED,
];

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: so, isLoading } = useSalesOrder(id);
  const { data: productsData } = useProducts({ pageSize: 100 });
  const confirmOrder = useConfirmSalesOrder();
  const shipOrder = useShipSalesOrder();
  const deliverOrder = useDeliverSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const deleteDraft = useDeleteSalesOrderDraft();

  const productById = new Map((productsData?.data ?? []).map((p) => [p.id, p]));

  if (isLoading) return <LoadingSpinner />;
  if (!so) return <p className="text-muted-foreground">Sales order not found.</p>;

  const onError = (action: string) => (error: unknown) => {
    toast.error(error instanceof ApiError ? error.message : `Failed to ${action}`);
  };

  const handleDeleteDraft = () => {
    if (!window.confirm(`Delete draft sales order ${so.orderNumber}?`)) return;

    deleteDraft.mutate(so.id, {
      onSuccess: () => {
        toast.success('Draft deleted');
        router.push('/dashboard/sales-orders');
      },
      onError: onError('delete draft'),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{so.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Ordered {formatDate(so.orderDate)} for {so.customerName}
          </p>
        </div>
        <OrderStatusBadge status={so.status} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <StatusTimeline
            steps={['draft', 'confirmed', 'shipped', 'delivered']}
            currentStatus={so.status}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {so.status === SalesOrderStatus.DRAFT ? (
          <>
            <Button
              onClick={() =>
                confirmOrder.mutate(so.id, {
                  onSuccess: () => toast.success('Order confirmed'),
                  onError: onError('confirm order'),
                })
              }
              disabled={confirmOrder.isPending}
            >
              Confirm order
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
        {so.status === SalesOrderStatus.CONFIRMED ? (
          <Button
            onClick={() =>
              shipOrder.mutate(so.id, {
                onSuccess: () => toast.success('Order shipped'),
                onError: onError('ship order'),
              })
            }
            disabled={shipOrder.isPending}
          >
            Mark as shipped
          </Button>
        ) : null}
        {so.status === SalesOrderStatus.SHIPPED ? (
          <Button
            onClick={() =>
              deliverOrder.mutate(so.id, {
                onSuccess: () => toast.success('Order delivered'),
                onError: onError('deliver order'),
              })
            }
            disabled={deliverOrder.isPending}
          >
            Mark as delivered
          </Button>
        ) : null}
        {CANCELLABLE_STATUSES.includes(so.status) ? (
          <Button
            variant="outline"
            onClick={() =>
              cancelOrder.mutate(so.id, {
                onSuccess: () => toast.success('Order cancelled'),
                onError: onError('cancel order'),
              })
            }
            disabled={cancelOrder.isPending}
          >
            Cancel order
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable
            items={so.items}
            productLabel={(productId) => productById.get(productId)?.name ?? productId}
          />
        </CardContent>
      </Card>

      {so.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{so.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
