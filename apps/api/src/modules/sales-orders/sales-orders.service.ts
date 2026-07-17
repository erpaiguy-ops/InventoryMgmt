import {
  SalesOrderStatus,
  StockMovementReferenceType,
  StockMovementType,
  type PaginatedResult,
  type SalesOrder,
  type SalesOrderItem,
} from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';
import { InventoryService } from '../inventory/inventory.service';

import { CreateSalesOrderDto } from './dto/create-so.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-so-status.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';

function toSalesOrder(row: {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  order_date: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): SalesOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    orderDate: row.order_date,
    status: row.status as SalesOrderStatus,
    totalAmount: row.total_amount,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: {
  id: string;
  so_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}): SalesOrderItem {
  return {
    id: row.id,
    soId: row.so_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
  };
}

export interface SalesOrderWithItems extends SalesOrder {
  items: SalesOrderItem[];
}

const STOCK_DEDUCTED_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.SHIPPED,
  SalesOrderStatus.DELIVERED,
];

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly inventoryService: InventoryService,
  ) {}

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SO-${datePart}-${random}`;
  }

  async create(dto: CreateSalesOrderDto, createdBy?: string): Promise<SalesOrderWithItems> {
    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const { data: so, error: soError } = await this.supabaseService
      .getTable('sales_orders')
      .insert({
        order_number: this.generateOrderNumber(),
        customer_name: dto.customerName,
        customer_email: dto.customerEmail,
        status: 'draft',
        total_amount: totalAmount,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single();

    if (soError || !so) {
      throw new ConflictException(soError?.message ?? 'Failed to create sales order');
    }

    const { data: items, error: itemsError } = await this.supabaseService
      .getTable('sales_order_items')
      .insert(
        dto.items.map((item) => ({
          so_id: so.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      )
      .select();

    if (itemsError || !items) {
      await this.supabaseService.getTable('sales_orders').delete().eq('id', so.id);
      throw new ConflictException(itemsError?.message ?? 'Failed to create sales order items');
    }

    return { ...toSalesOrder(so), items: items.map(toItem) };
  }

  async findAll(query: ListSalesOrdersDto): Promise<PaginatedResult<SalesOrder>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.getTable('sales_orders').select('*', { count: 'exact' });

    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    if (query.customerEmail) {
      builder = builder.eq('customer_email', query.customerEmail);
    }

    const { data, error, count } = await builder
      .order('order_date', { ascending: false })
      .range(from, to);

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []).map(toSalesOrder),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(id: string): Promise<SalesOrderWithItems> {
    const { data: so, error } = await this.supabaseService
      .getTable('sales_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !so) {
      throw new NotFoundException(`Sales order ${id} not found`);
    }

    const { data: items, error: itemsError } = await this.supabaseService
      .getTable('sales_order_items')
      .select('*')
      .eq('so_id', id);

    if (itemsError) {
      throw new NotFoundException(itemsError.message);
    }

    return { ...toSalesOrder(so), items: (items ?? []).map(toItem) };
  }

  async getCustomerOrders(email: string): Promise<SalesOrder[]> {
    const { data, error } = await this.supabaseService
      .getTable('sales_orders')
      .select('*')
      .eq('customer_email', email)
      .order('order_date', { ascending: false });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toSalesOrder);
  }

  async update(id: string, dto: UpdateSalesOrderDto): Promise<SalesOrderWithItems> {
    const so = await this.findOne(id);

    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new ConflictException('Only draft sales orders can be updated');
    }

    if (dto.items) {
      const { error: deleteError } = await this.supabaseService
        .getTable('sales_order_items')
        .delete()
        .eq('so_id', id);

      if (deleteError) {
        throw new ConflictException(deleteError.message);
      }

      const { error: insertError } = await this.supabaseService
        .getTable('sales_order_items')
        .insert(
          dto.items.map((item) => ({
            so_id: id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          })),
        );

      if (insertError) {
        throw new ConflictException(insertError.message);
      }
    }

    const totalAmount = dto.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const { data, error } = await this.supabaseService
      .getTable('sales_orders')
      .update({
        customer_name: dto.customerName,
        customer_email: dto.customerEmail,
        notes: dto.notes,
        total_amount: totalAmount,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update sales order');
    }

    return this.findOne(id);
  }

  private async setStatus(id: string, status: SalesOrderStatus): Promise<SalesOrderWithItems> {
    const { error } = await this.supabaseService
      .getTable('sales_orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new ConflictException(error.message);
    }

    return this.findOne(id);
  }

  /**
   * draft -> confirmed deducts stock for every line item; any transition to
   * 'cancelled' from a stock-deducted status returns that stock. Deliveries
   * are terminal — a delivered order cannot be cancelled.
   */
  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto): Promise<SalesOrderWithItems> {
    const target = dto.status as SalesOrderStatus;
    const so = await this.findOne(id);

    const validTransitions: Record<string, SalesOrderStatus[]> = {
      [SalesOrderStatus.DRAFT]: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.CANCELLED],
      [SalesOrderStatus.CONFIRMED]: [SalesOrderStatus.SHIPPED, SalesOrderStatus.CANCELLED],
      [SalesOrderStatus.SHIPPED]: [SalesOrderStatus.DELIVERED, SalesOrderStatus.CANCELLED],
    };

    if (!validTransitions[so.status]?.includes(target)) {
      throw new ConflictException(`Cannot move sales order from '${so.status}' to '${target}'`);
    }

    if (target === SalesOrderStatus.CONFIRMED) {
      return this.deductStock(so);
    }

    if (target === SalesOrderStatus.CANCELLED) {
      return this.cancel(so);
    }

    return this.setStatus(id, target);
  }

  private async deductStock(so: SalesOrderWithItems): Promise<SalesOrderWithItems> {
    for (const item of so.items) {
      const { available } = await this.inventoryService.validateStock({
        productId: item.productId,
        quantity: item.quantity,
      });

      if (!available) {
        throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
      }
    }

    for (const item of so.items) {
      try {
        await this.inventoryService.updateStock(
          item.productId,
          -item.quantity,
          StockMovementType.SALE,
          {
            referenceId: so.id,
            referenceType: StockMovementReferenceType.SALES_ORDER,
            notes: `Confirmed against ${so.orderNumber}`,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to deduct stock for product ${item.productId} on SO ${so.id}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    return this.setStatus(so.id, SalesOrderStatus.CONFIRMED);
  }

  private async cancel(so: SalesOrderWithItems): Promise<SalesOrderWithItems> {
    if (STOCK_DEDUCTED_STATUSES.includes(so.status)) {
      for (const item of so.items) {
        await this.inventoryService.updateStock(
          item.productId,
          item.quantity,
          StockMovementType.RETURN,
          {
            referenceId: so.id,
            referenceType: StockMovementReferenceType.SALES_ORDER,
            notes: `Cancelled ${so.orderNumber}`,
          },
        );
      }
    }

    return this.setStatus(so.id, SalesOrderStatus.CANCELLED);
  }

  confirmOrder(id: string): Promise<SalesOrderWithItems> {
    return this.updateStatus(id, { status: 'confirmed' });
  }

  shipOrder(id: string): Promise<SalesOrderWithItems> {
    return this.updateStatus(id, { status: 'shipped' });
  }

  deliverOrder(id: string): Promise<SalesOrderWithItems> {
    return this.updateStatus(id, { status: 'delivered' });
  }

  cancelOrder(id: string): Promise<SalesOrderWithItems> {
    return this.updateStatus(id, { status: 'cancelled' });
  }

  async deleteDraft(id: string): Promise<void> {
    const so = await this.findOne(id);

    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new ConflictException('Only draft sales orders can be deleted');
    }

    const { error } = await this.supabaseService.getTable('sales_orders').delete().eq('id', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }

  async getStats(): Promise<{
    totalOrders: number;
    totalValue: number;
    byStatus: Record<string, number>;
  }> {
    const { data, error } = await this.supabaseService
      .getTable('sales_orders')
      .select('status, total_amount');

    if (error) {
      throw new NotFoundException(error.message);
    }

    const rows = data ?? [];
    const byStatus: Record<string, number> = {};

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    }

    return {
      totalOrders: rows.length,
      totalValue: rows.reduce((sum, row) => sum + (row.total_amount ?? 0), 0),
      byStatus,
    };
  }

  async generateReport(query: ListSalesOrdersDto): Promise<{
    orders: SalesOrder[];
    summary: { totalOrders: number; totalValue: number };
  }> {
    const { data } = await this.findAll({ ...query, pageSize: 100 });

    return {
      orders: data,
      summary: {
        totalOrders: data.length,
        totalValue: data.reduce((sum, so) => sum + (so.totalAmount ?? 0), 0),
      },
    };
  }
}
