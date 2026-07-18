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

interface PurchaseOrderRow {
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
}

interface ItemRow {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

type QueryError = { message: string } | null;

function toPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
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

function toItem(row: ItemRow): PurchaseOrderItem {
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

  /**
   * Rejects any item whose product doesn't belong to the caller's tenant with
   * a clean 400 before touching the item table. The check_po_item_tenant DB
   * trigger would reject such writes anyway — this just turns a raw database
   * error into a proper validation response.
   */
  private async assertProductsBelongToTenant(
    tenantId: string,
    productIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(productIds)];

    const { count, error } = await this.supabaseService
      .selectTenant(tenantId, 'products', 'id', { count: 'exact', head: true })
      .in('id', uniqueIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    if ((count ?? 0) !== uniqueIds.length) {
      throw new BadRequestException('One or more products do not belong to this organization');
    }
  }

  async create(
    tenantId: string,
    dto: CreatePurchaseOrderDto,
    createdBy?: string,
  ): Promise<PurchaseOrderWithItems> {
    await this.assertProductsBelongToTenant(
      tenantId,
      dto.items.map((item) => item.productId),
    );

    if (dto.supplierId) {
      const { data: supplier } = (await this.supabaseService
        .selectTenant(tenantId, 'suppliers', 'id')
        .eq('id', dto.supplierId)
        .maybeSingle()) as { data: { id: string } | null };

      if (!supplier) {
        throw new BadRequestException('supplierId does not belong to this organization');
      }
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const { data: po, error: poError } = (await this.supabaseService
      .insertTenant(tenantId, 'purchase_orders', {
        po_number: this.generatePONumber(),
        supplier_id: dto.supplierId,
        expected_delivery: dto.expectedDelivery,
        status: 'draft',
        total_amount: totalAmount,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: PurchaseOrderRow | null; error: QueryError };

    if (poError || !po) {
      throw new ConflictException(poError?.message ?? 'Failed to create purchase order');
    }

    const { data: items, error: itemsError } = (await this.supabaseService
      .getItemsTable('purchase_order_items')
      .insert(
        dto.items.map((item) => ({
          po_id: po.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      )
      .select()) as { data: ItemRow[] | null; error: QueryError };

    if (itemsError || !items) {
      // Best-effort compensation: Supabase's REST layer has no cross-table
      // transaction, so roll back the header row if the items insert failed.
      await this.supabaseService.deleteTenant(tenantId, 'purchase_orders', po.id);
      throw new ConflictException(itemsError?.message ?? 'Failed to create purchase order items');
    }

    return { ...toPurchaseOrder(po), items: items.map(toItem) };
  }

  async findAll(
    tenantId: string,
    query: ListPurchaseOrdersDto,
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.selectTenant(tenantId, 'purchase_orders', '*', {
      count: 'exact',
    });

    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    if (query.supplierId) {
      builder = builder.eq('supplier_id', query.supplierId);
    }

    const { data, error, count } = (await builder
      .order('order_date', { ascending: false })
      .range(from, to)) as unknown as {
      data: PurchaseOrderRow[] | null;
      error: QueryError;
      count: number | null;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []).map(toPurchaseOrder),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(tenantId: string, id: string): Promise<PurchaseOrderWithItems> {
    const { data: po, error } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders')
      .eq('id', id)
      .maybeSingle()) as { data: PurchaseOrderRow | null; error: QueryError };

    if (error || !po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    const { data: items, error: itemsError } = (await this.supabaseService
      .getItemsTable('purchase_order_items')
      .select('*')
      .eq('po_id', id)) as { data: ItemRow[] | null; error: QueryError };

    if (itemsError) {
      throw new NotFoundException(itemsError.message);
    }

    return { ...toPurchaseOrder(po), items: (items ?? []).map(toItem) };
  }

  async getSupplierOrders(tenantId: string, supplierId: string): Promise<PurchaseOrder[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders')
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false })) as unknown as {
      data: PurchaseOrderRow[] | null;
      error: QueryError;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toPurchaseOrder);
  }

  private async requireStatus(
    tenantId: string,
    id: string,
    allowed: PurchaseOrderStatus[],
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.findOne(tenantId, id);

    if (!allowed.includes(po.status)) {
      throw new ConflictException(
        `Purchase order ${id} has status '${po.status}'; expected one of: ${allowed.join(', ')}`,
      );
    }

    return po;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderWithItems> {
    await this.requireStatus(tenantId, id, [PurchaseOrderStatus.DRAFT]);

    if (dto.items) {
      await this.assertProductsBelongToTenant(
        tenantId,
        dto.items.map((item) => item.productId),
      );

      const { error: deleteError } = await this.supabaseService
        .getItemsTable('purchase_order_items')
        .delete()
        .eq('po_id', id);

      if (deleteError) {
        throw new ConflictException(deleteError.message);
      }

      const { error: insertError } = await this.supabaseService
        .getItemsTable('purchase_order_items')
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

    const { error } = await this.supabaseService.updateTenant(tenantId, 'purchase_orders', id, {
      supplier_id: dto.supplierId,
      expected_delivery: dto.expectedDelivery,
      notes: dto.notes,
      total_amount: totalAmount,
    });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return this.findOne(tenantId, id);
  }

  /** draft <-> pending <-> cancelled only; use receive() to move to 'received'. */
  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderStatusDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['draft', 'cancelled'],
    };

    if (!validTransitions[po.status]?.includes(dto.status)) {
      throw new ConflictException(
        `Cannot move purchase order from '${po.status}' to '${dto.status}'`,
      );
    }

    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'purchase_orders', id, { status: dto.status })
      .select()
      .maybeSingle()) as { data: PurchaseOrderRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update purchase order status');
    }

    return toPurchaseOrder(data);
  }

  async receive(
    tenantId: string,
    id: string,
    dto: ReceivePurchaseOrderDto,
    createdBy?: string,
  ): Promise<PurchaseOrderWithItems> {
    const po = await this.requireStatus(tenantId, id, [PurchaseOrderStatus.PENDING]);
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
          tenantId,
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

    const { error } = await this.supabaseService.updateTenant(tenantId, 'purchase_orders', id, {
      status: 'received',
    });

    if (error) {
      throw new ConflictException(error.message);
    }

    return this.findOne(tenantId, id);
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(tenantId, id);

    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new ConflictException('Cannot cancel a purchase order that has already been received');
    }

    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'purchase_orders', id, { status: 'cancelled' })
      .select()
      .maybeSingle()) as { data: PurchaseOrderRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to cancel purchase order');
    }

    return toPurchaseOrder(data);
  }

  async deleteDraft(tenantId: string, id: string): Promise<void> {
    await this.requireStatus(tenantId, id, [PurchaseOrderStatus.DRAFT]);

    const { error } = await this.supabaseService.deleteTenant(tenantId, 'purchase_orders', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }

  async getStats(tenantId: string): Promise<{
    totalOrders: number;
    totalValue: number;
    byStatus: Record<string, number>;
  }> {
    const { data, error } = (await this.supabaseService.selectTenant(
      tenantId,
      'purchase_orders',
      'status, total_amount',
    )) as unknown as {
      data: { status: string; total_amount: number | null }[] | null;
      error: QueryError;
    };

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

  async generateReport(
    tenantId: string,
    query: ListPurchaseOrdersDto,
  ): Promise<{
    orders: PurchaseOrder[];
    summary: { totalOrders: number; totalValue: number };
  }> {
    const { data } = await this.findAll(tenantId, { ...query, pageSize: 100 });

    return {
      orders: data,
      summary: {
        totalOrders: data.length,
        totalValue: data.reduce((sum, po) => sum + (po.totalAmount ?? 0), 0),
      },
    };
  }
}
