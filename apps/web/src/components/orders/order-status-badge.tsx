import { Badge, type BadgeProps } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  draft: 'secondary',
  pending: 'warning',
  confirmed: 'warning',
  shipped: 'default',
  received: 'success',
  delivered: 'success',
  cancelled: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  received: 'Received',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{STATUS_LABEL[status] ?? status}</Badge>
  );
}
