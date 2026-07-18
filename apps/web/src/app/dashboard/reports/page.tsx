'use client';

import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { useState } from 'react';

import { ExportButton } from '@/components/reports/export-button';
import { ReportBarChart } from '@/components/reports/report-charts';
import { ReportFilters } from '@/components/reports/report-filters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrincipal } from '@/hooks/use-principal';
import {
  useCategoryReport,
  useInventoryReport,
  useProfitReport,
  usePurchaseReport,
  useSalesReport,
  useSupplierReport,
  useTopProducts,
} from '@/hooks/use-reports';
import { formatCurrency } from '@/utils/format';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  // Mirrors the backend gates: profit + export require reports:manage.
  const canExport = hasPermission(permissions, MODULES.REPORTS, ACTIONS.MANAGE);
  const params = { from: from || undefined, to: to || undefined };

  const { data: inventory } = useInventoryReport();
  const { data: sales } = useSalesReport(params);
  const { data: purchases } = usePurchaseReport(params);
  const { data: profit } = useProfitReport(params, canExport);
  const { data: topProducts = [] } = useTopProducts(10, params);
  const { data: categories = [] } = useCategoryReport(params);
  const { data: suppliers = [] } = useSupplierReport();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
      </div>

      <ReportFilters from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          {canExport ? <TabsTrigger value="profit">Profit</TabsTrigger> : null}
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {canExport ? <ExportButton type="sales" params={params} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total orders" value={sales?.totalOrders ?? 0} />
            <StatTile label="Total revenue" value={formatCurrency(sales?.totalRevenue ?? 0)} />
            <StatTile
              label="Average order value"
              value={formatCurrency(sales?.averageOrderValue ?? 0)}
            />
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          {canExport ? <ExportButton type="purchase" params={params} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label="Total orders" value={purchases?.totalOrders ?? 0} />
            <StatTile label="Total spend" value={formatCurrency(purchases?.totalSpend ?? 0)} />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {canExport ? <ExportButton type="inventory" /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total products" value={inventory?.totalProducts ?? 0} />
            <StatTile label="Total units" value={inventory?.totalUnits ?? 0} />
            <StatTile label="Low stock items" value={inventory?.lowStockCount ?? 0} />
            <StatTile label="Cost value" value={formatCurrency(inventory?.totalCostValue ?? 0)} />
            <StatTile
              label="Retail value"
              value={formatCurrency(inventory?.totalRetailValue ?? 0)}
            />
          </div>
        </TabsContent>

        {canExport ? (
          <TabsContent value="profit" className="space-y-4">
            <ExportButton type="profit" params={params} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile label="Revenue" value={formatCurrency(profit?.revenue ?? 0)} />
              <StatTile
                label="Cost of goods sold"
                value={formatCurrency(profit?.costOfGoodsSold ?? 0)}
              />
              <StatTile label="Gross profit" value={formatCurrency(profit?.grossProfit ?? 0)} />
              <StatTile
                label="Gross margin"
                value={`${(profit?.grossMarginPct ?? 0).toFixed(1)}%`}
              />
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="top-products" className="space-y-4">
          {canExport ? <ExportButton type="top-products" params={params} /> : null}
          <ReportBarChart
            data={topProducts.map((p) => ({ label: p.name, value: p.unitsSold }))}
            valueLabel="Units sold"
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {canExport ? <ExportButton type="categories" params={params} /> : null}
          <ReportBarChart
            data={categories.map((c) => ({ label: c.category, value: c.revenue }))}
            valueLabel="Revenue"
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          {canExport ? <ExportButton type="suppliers" /> : null}
          <ReportBarChart
            data={suppliers.map((s) => ({ label: s.supplierName, value: s.totalSpend }))}
            valueLabel="Total spend"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
