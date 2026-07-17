'use client';

import { Package, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import Link from 'next/link';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { LowStockAlert } from '@/components/inventory/low-stock-alert';
import { ReportBarChart } from '@/components/reports/report-charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats, useTopProducts } from '@/hooks/use-reports';
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

const QUICK_ACTIONS = [
  { href: '/dashboard/products/create', label: 'Add Product', icon: Package },
  { href: '/dashboard/purchase-orders/create', label: 'Create PO', icon: ShoppingCart },
  { href: '/dashboard/sales-orders/create', label: 'Create SO', icon: Truck },
  { href: '/dashboard/inventory', label: 'Adjust Stock', icon: Warehouse },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: topProducts = [] } = useTopProducts(5);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top selling products</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportBarChart
              data={topProducts.map((p) => ({ label: p.name, value: p.unitsSold }))}
              valueLabel="Units sold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.href} asChild variant="outline" className="h-20 flex-col gap-2">
                <Link href={action.href}>
                  <action.icon className="h-6 w-6" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
