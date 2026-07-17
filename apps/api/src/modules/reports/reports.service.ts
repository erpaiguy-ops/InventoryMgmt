import { SalesOrderStatus } from '@inventory-mgmt/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { ExportReportDto } from './dto/export-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';

const REVENUE_STATUSES = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
];

interface SalesOrderRow {
  id: string;
  status: string;
  order_date: string;
  total_amount: number | null;
}

interface SalesOrderItemRow {
  so_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getSalesOrdersInRange(query: ReportQueryDto): Promise<SalesOrderRow[]> {
    let builder = this.supabaseService
      .getTable('sales_orders')
      .select('id, status, order_date, total_amount');

    if (query.from) {
      builder = builder.gte('order_date', query.from);
    }

    if (query.to) {
      builder = builder.lte('order_date', query.to);
    }

    const { data, error } = await builder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  private async getPurchaseOrdersInRange(query: ReportQueryDto) {
    let builder = this.supabaseService
      .getTable('purchase_orders')
      .select('id, status, order_date, total_amount, supplier_id');

    if (query.from) {
      builder = builder.gte('order_date', query.from);
    }

    if (query.to) {
      builder = builder.lte('order_date', query.to);
    }

    const { data, error } = await builder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  private async getItemsForOrders(soIds: string[]): Promise<SalesOrderItemRow[]> {
    if (soIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabaseService
      .getTable('sales_order_items')
      .select('so_id, product_id, quantity, unit_price, total_price')
      .in('so_id', soIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  async getInventoryReport(): Promise<{
    totalProducts: number;
    totalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
    lowStockCount: number;
  }> {
    const [{ data: products, error: productsError }, { data: inventory, error: inventoryError }] =
      await Promise.all([
        this.supabaseService
          .getTable('products')
          .select('id, unit_price, cost_price, reorder_level'),
        this.supabaseService.getTable('inventory').select('product_id, quantity'),
      ]);

    if (productsError || inventoryError) {
      throw new BadRequestException(productsError?.message ?? inventoryError?.message);
    }

    const quantityByProduct = new Map(
      (inventory ?? []).map((row) => [row.product_id, row.quantity]),
    );
    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;

    for (const product of products ?? []) {
      const quantity = quantityByProduct.get(product.id) ?? 0;
      totalUnits += quantity;
      totalCostValue += quantity * (product.cost_price ?? 0);
      totalRetailValue += quantity * product.unit_price;
      if (quantity <= product.reorder_level) {
        lowStockCount += 1;
      }
    }

    return {
      totalProducts: (products ?? []).length,
      totalUnits,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
    };
  }

  async getSalesReport(query: ReportQueryDto): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    byStatus: Record<string, number>;
  }> {
    const orders = await this.getSalesOrdersInRange(query);
    const revenueOrders = orders.filter((o) =>
      REVENUE_STATUSES.includes(o.status as SalesOrderStatus),
    );
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
    const byStatus: Record<string, number> = {};

    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    }

    return {
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue: revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0,
      byStatus,
    };
  }

  async getPurchaseReport(query: ReportQueryDto): Promise<{
    totalOrders: number;
    totalSpend: number;
    byStatus: Record<string, number>;
  }> {
    const orders = await this.getPurchaseOrdersInRange(query);
    const byStatus: Record<string, number> = {};

    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    }

    return {
      totalOrders: orders.length,
      totalSpend: orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0),
      byStatus,
    };
  }

  async getProfitReport(query: ReportQueryDto): Promise<{
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMarginPct: number;
  }> {
    const orders = await this.getSalesOrdersInRange(query);
    const revenueOrderIds = orders
      .filter((o) => REVENUE_STATUSES.includes(o.status as SalesOrderStatus))
      .map((o) => o.id);
    const items = await this.getItemsForOrders(revenueOrderIds);

    const { data: products, error } = await this.supabaseService
      .getTable('products')
      .select('id, cost_price');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const costByProduct = new Map((products ?? []).map((p) => [p.id, p.cost_price ?? 0]));
    const revenue = items.reduce((sum, item) => sum + item.total_price, 0);
    const costOfGoodsSold = items.reduce(
      (sum, item) => sum + item.quantity * (costByProduct.get(item.product_id) ?? 0),
      0,
    );
    const grossProfit = revenue - costOfGoodsSold;

    return {
      revenue,
      costOfGoodsSold,
      grossProfit,
      grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    };
  }

  async getTopProducts(
    limit = 10,
    query: ReportQueryDto = {},
  ): Promise<
    { productId: string; sku: string; name: string; unitsSold: number; revenue: number }[]
  > {
    const orders = await this.getSalesOrdersInRange(query);
    const revenueOrderIds = orders
      .filter((o) => REVENUE_STATUSES.includes(o.status as SalesOrderStatus))
      .map((o) => o.id);
    const items = await this.getItemsForOrders(revenueOrderIds);

    const totalsByProduct = new Map<string, { unitsSold: number; revenue: number }>();

    for (const item of items) {
      const current = totalsByProduct.get(item.product_id) ?? { unitsSold: 0, revenue: 0 };
      current.unitsSold += item.quantity;
      current.revenue += item.total_price;
      totalsByProduct.set(item.product_id, current);
    }

    const { data: products, error } = await this.supabaseService
      .getTable('products')
      .select('id, sku, name')
      .in('id', [...totalsByProduct.keys()]);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const productById = new Map((products ?? []).map((p) => [p.id, p]));

    return [...totalsByProduct.entries()]
      .map(([productId, totals]) => ({
        productId,
        sku: productById.get(productId)?.sku ?? 'unknown',
        name: productById.get(productId)?.name ?? 'unknown',
        ...totals,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit);
  }

  async getCategoryReport(
    query: ReportQueryDto = {},
  ): Promise<{ category: string; unitsSold: number; revenue: number }[]> {
    const orders = await this.getSalesOrdersInRange(query);
    const revenueOrderIds = orders
      .filter((o) => REVENUE_STATUSES.includes(o.status as SalesOrderStatus))
      .map((o) => o.id);
    const items = await this.getItemsForOrders(revenueOrderIds);

    const { data: products, error } = await this.supabaseService
      .getTable('products')
      .select('id, category');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const categoryByProduct = new Map(
      (products ?? []).map((p) => [p.id, p.category ?? 'Uncategorized']),
    );
    const totalsByCategory = new Map<string, { unitsSold: number; revenue: number }>();

    for (const item of items) {
      const category = categoryByProduct.get(item.product_id) ?? 'Uncategorized';
      const current = totalsByCategory.get(category) ?? { unitsSold: 0, revenue: 0 };
      current.unitsSold += item.quantity;
      current.revenue += item.total_price;
      totalsByCategory.set(category, current);
    }

    return [...totalsByCategory.entries()]
      .map(([category, totals]) => ({ category, ...totals }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getSupplierReport(): Promise<
    { supplierId: string; supplierName: string; totalOrders: number; totalSpend: number }[]
  > {
    const [{ data: orders, error: ordersError }, { data: suppliers, error: suppliersError }] =
      await Promise.all([
        this.supabaseService.getTable('purchase_orders').select('supplier_id, total_amount'),
        this.supabaseService.getTable('suppliers').select('id, name'),
      ]);

    if (ordersError || suppliersError) {
      throw new BadRequestException(ordersError?.message ?? suppliersError?.message);
    }

    const supplierById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
    const totalsBySupplier = new Map<string, { totalOrders: number; totalSpend: number }>();

    for (const order of orders ?? []) {
      if (!order.supplier_id) continue;
      const current = totalsBySupplier.get(order.supplier_id) ?? { totalOrders: 0, totalSpend: 0 };
      current.totalOrders += 1;
      current.totalSpend += order.total_amount ?? 0;
      totalsBySupplier.set(order.supplier_id, current);
    }

    return [...totalsBySupplier.entries()]
      .map(([supplierId, totals]) => ({
        supplierId,
        supplierName: supplierById.get(supplierId) ?? 'Unknown supplier',
        ...totals,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }

  async getDashboardStats(): Promise<{
    inventory: Awaited<ReturnType<ReportsService['getInventoryReport']>>;
    pendingPurchaseOrders: number;
    openSalesOrders: number;
    salesLast30Days: { totalOrders: number; totalRevenue: number };
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      inventory,
      salesLast30Days,
      { count: pendingPurchaseOrders },
      { count: openSalesOrders },
    ] = await Promise.all([
      this.getInventoryReport(),
      this.getSalesReport({ from: thirtyDaysAgo }),
      this.supabaseService
        .getTable('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      this.supabaseService
        .getTable('sales_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'confirmed', 'shipped']),
    ]);

    return {
      inventory,
      pendingPurchaseOrders: pendingPurchaseOrders ?? 0,
      openSalesOrders: openSalesOrders ?? 0,
      salesLast30Days: {
        totalOrders: salesLast30Days.totalOrders,
        totalRevenue: salesLast30Days.totalRevenue,
      },
    };
  }

  async exportReport(dto: ExportReportDto): Promise<{ filename: string; csv: string }> {
    const query: ReportQueryDto = { from: dto.from, to: dto.to };
    let rows: Record<string, unknown>[];

    switch (dto.type) {
      case 'inventory':
        rows = [await this.getInventoryReport()];
        break;
      case 'sales':
        rows = [await this.getSalesReport(query)];
        break;
      case 'purchase':
        rows = [await this.getPurchaseReport(query)];
        break;
      case 'profit':
        rows = [await this.getProfitReport(query)];
        break;
      case 'top-products':
        rows = await this.getTopProducts(20, query);
        break;
      case 'categories':
        rows = await this.getCategoryReport(query);
        break;
      case 'suppliers':
        rows = await this.getSupplierReport();
        break;
    }

    return { filename: `${dto.type}-report-${Date.now()}.csv`, csv: this.toCsv(rows) };
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const escape = (value: unknown): string => {
      const str = String(value ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((header) => escape(row[header])).join(','));
    }

    return lines.join('\n');
  }
}
