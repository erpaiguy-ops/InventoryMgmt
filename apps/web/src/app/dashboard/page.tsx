'use client';

import Link from 'next/link';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { LowStockAlert } from '@/components/inventory/low-stock-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-reports';
import { formatCurrency } from '@/utils/format';

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'hover:bg-accent/50 transition-colors' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <LowStockAlert />

      {isLoading || !stats ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Products"
            value={stats.inventory.totalProducts}
            href="/dashboard/products"
          />
          <StatCard
            label="Units in stock"
            value={stats.inventory.totalUnits}
            href="/dashboard/inventory"
          />
          <StatCard
            label="Retail value"
            value={formatCurrency(stats.inventory.totalRetailValue)}
            href="/dashboard/reports"
          />
          <StatCard
            label="Low stock items"
            value={stats.inventory.lowStockCount}
            href="/dashboard/inventory"
          />
          <StatCard
            label="Pending purchase orders"
            value={stats.pendingPurchaseOrders}
            href="/dashboard/purchase-orders"
          />
          <StatCard
            label="Open sales orders"
            value={stats.openSalesOrders}
            href="/dashboard/sales-orders"
          />
          <StatCard label="Sales (last 30 days)" value={stats.salesLast30Days.totalOrders} />
          <StatCard
            label="Revenue (last 30 days)"
            value={formatCurrency(stats.salesLast30Days.totalRevenue)}
          />
        </div>
      )}
    </div>
  );
}
