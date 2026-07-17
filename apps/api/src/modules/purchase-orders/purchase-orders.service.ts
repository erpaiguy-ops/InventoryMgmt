import {
  PurchaseOrderStatus,
  StockMovementReferenceType,
  StockMovementType,
  type PaginatedResult,
  type PurchaseOrder,
  type PurchaseOrderItem,
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

import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-po.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-po-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';

function toPurchaseOrder(row: {
  id: string;
  po_number: string;
  supplier_id: string | null;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  total_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery,
    status: row.status as PurchaseOrderStatus,
    totalAmount: row.total_amount,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}): PurchaseOrderItem {
  return {
    id: row.id,
    poId: row.po_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
  };
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly inventoryService: InventoryService,
  ) {}

  private generatePONumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PO-${datePart}-${random}`;
  }

  async create(dto: CreatePurchaseOrderDto, createdBy?: string): Promise<PurchaseOrderWithItems> {
    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const { data: po, error: poError } = await this.supabaseService
      .getTable('purchase_orders')
      .insert({
        po_number: this.generatePONumber(),
        supplier_id: dto.supplierId,
        expected_delivery: dto.expectedDelivery,
        status: 'draft',
        total_amount: totalAmount,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single();

    if (poError || !po) {
      throw new ConflictException(poError?.message ?? 'Failed to create purchase order');
    }

    const { data: items, error: itemsError } = await this.supabaseService
      .getTable('purchase_order_items')
      .insert(
        dto.items.map((item) => ({
          po_id: po.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      )
      .select();

    if (itemsError || !items) {
      // Best-effort compensation: Supabase's REST layer has no cross-table
      // transaction, so roll back the header row if the items insert failed.
      await this.supabaseService.getTable('purchase_orders').delete().eq('id', po.id);
      throw new ConflictException(itemsError?.message ?? 'Failed to create purchase order items');
    }

    return { ...toPurchaseOrder(po), items: items.map(toItem) };
  }

  async findAll(query: ListPurchaseOrdersDto): Promise<PaginatedResult<PurchaseOrder>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.getTable('purchase_orders').select('*', { count: 'exact' });

    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    if (query.supplierId) {
      builder = builder.eq('supplier_id', query.supplierId);
    }

    const { data, error, count } = await builder
      .order('order_date', { ascending: false })
      .range(from, to);

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []).map(toPurchaseOrder),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(id: string): Promise<PurchaseOrderWithItems> {
    const { data: po, error } = await this.supabaseService
      .getTable('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    const { data: items, error: itemsError } = await this.supabaseService
      .getTable('purchase_order_items')
      .select('*')
      .eq('po_id', id);

    if (itemsError) {
      throw new NotFoundException(itemsError.message);
    }

    return { ...toPurchaseOrder(po), items: (items ?? []).map(toItem) };
  }

  async getSupplierOrders(supplierId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await this.supabaseService
      .getTable('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toPurchaseOrder);
  }

  private async requireStatus(
    id: string,
    allowed: PurchaseOrderStatus[],
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(id);

    if (!allowed.includes(po.status)) {
      throw new ConflictException(
        `Purchase order ${id} has status '${po.status}'; expected one of: ${allowed.join(', ')}`,
      );
    }

    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrderWithItems> {
    await this.requireStatus(id, [PurchaseOrderStatus.DRAFT]);

    if (dto.items) {
      const { error: deleteError } = await this.supabaseService
        .getTable('purchase_order_items')
        .delete()
        .eq('po_id', id);

      if (deleteError) {
        throw new ConflictException(deleteError.message);
      }

      const { error: insertError } = await this.supabaseService
        .getTable('purchase_order_items')
        .insert(
          dto.items.map((item) => ({
            po_id: id,
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
      .getTable('purchase_orders')
      .update({
        supplier_id: dto.supplierId,
        expected_delivery: dto.expectedDelivery,
        notes: dto.notes,
        total_amount: totalAmount,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update purchase order');
    }

    return this.findOne(id);
  }

  /** draft <-> pending <-> cancelled only; use receive() to move to 'received'. */
  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['draft', 'cancelled'],
    };

    if (!validTransitions[po.status]?.includes(dto.status)) {
      throw new ConflictException(
        `Cannot move purchase order from '${po.status}' to '${dto.status}'`,
      );
    }

    const { data, error } = await this.supabaseService
      .getTable('purchase_orders')
      .update({ status: dto.status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update purchase order status');
    }

    return toPurchaseOrder(data);
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    createdBy?: string,
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.requireStatus(id, [PurchaseOrderStatus.PENDING]);
    const itemsByProduct = new Map(po.items.map((item) => [item.productId, item]));

    for (const received of dto.receivedItems) {
      const orderedItem = itemsByProduct.get(received.productId);

      if (!orderedItem) {
        throw new BadRequestException(
          `Product ${received.productId} is not part of purchase order ${id}`,
        );
      }

      if (received.quantityReceived > orderedItem.quantity) {
        throw new BadRequestException(
          `Received quantity for product ${received.productId} exceeds ordered quantity`,
        );
      }
    }

    for (const received of dto.receivedItems) {
      try {
        await this.inventoryService.updateStock(
          received.productId,
          received.quantityReceived,
          StockMovementType.PURCHASE,
          {
            referenceId: po.id,
            referenceType: StockMovementReferenceType.PURCHASE_ORDER,
            notes: `Received against ${po.poNumber}`,
            createdBy,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to update inventory for product ${received.productId} on PO ${id}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    const { error } = await this.supabaseService
      .getTable('purchase_orders')
      .update({ status: 'received' })
      .eq('id', id);

    if (error) {
      throw new ConflictException(error.message);
    }

    return this.findOne(id);
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new ConflictException('Cannot cancel a purchase order that has already been received');
    }

    const { data, error } = await this.supabaseService
      .getTable('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to cancel purchase order');
    }

    return toPurchaseOrder(data);
  }

  async deleteDraft(id: string): Promise<void> {
    await this.requireStatus(id, [PurchaseOrderStatus.DRAFT]);

    const { error } = await this.supabaseService.getTable('purchase_orders').delete().eq('id', id);

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
      .getTable('purchase_orders')
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

  async generateReport(query: ListPurchaseOrdersDto): Promise<{
    orders: PurchaseOrder[];
    summary: { totalOrders: number; totalValue: number };
  }> {
    const { data } = await this.findAll({ ...query, pageSize: 100 });

    return {
      orders: data,
      summary: {
        totalOrders: data.length,
        totalValue: data.reduce((sum, po) => sum + (po.totalAmount ?? 0), 0),
      },
    };
  }
}
