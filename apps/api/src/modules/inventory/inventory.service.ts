import type {
  Inventory,
  PaginatedResult,
  StockMovement,
  StockMovementReferenceType,
  StockMovementType,
} from '@inventory-mgmt/shared-types';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkUpdateStockDto } from './dto/bulk-update-stock.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { ValidateStockDto } from './dto/validate-stock.dto';

interface InventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  warehouse_location: string | null;
  last_updated: string;
}

interface MovementRow {
  id: string;
  product_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  movement_type: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

type QueryError = { message: string } | null;

function toInventory(row: InventoryRow): Inventory {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    warehouseLocation: row.warehouse_location,
    lastUpdated: row.last_updated,
  };
}

function toMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    quantityChange: row.quantity_change,
    previousQuantity: row.previous_quantity,
    newQuantity: row.new_quantity,
    movementType: row.movement_type as StockMovementType,
    referenceId: row.reference_id,
    referenceType: row.reference_type as StockMovementReferenceType | null,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export interface BulkStockUpdateResult {
  productId: string;
  success: boolean;
  movement?: StockMovement;
  error?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getInventory(tenantId: string, productId: string): Promise<Inventory> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'inventory')
      .eq('product_id', productId)
      .maybeSingle()) as { data: InventoryRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(`No inventory record for product ${productId}`);
    }

    return toInventory(data);
  }

  async getAllInventory(tenantId: string): Promise<Inventory[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'inventory')
      .order('last_updated', { ascending: false })) as unknown as {
      data: InventoryRow[] | null;
      error: QueryError;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toInventory);
  }

  /**
   * Core stock-write path: inserts a stock_movements row. The
   * apply_stock_movement trigger computes previous/new quantity and updates
   * inventory.quantity atomically, rejecting movements that would go negative
   * — and, in v2, rejecting movements whose tenant doesn't own the product.
   */
  async updateStock(
    tenantId: string,
    productId: string,
    quantityChange: number,
    movementType: StockMovementType,
    options?: {
      referenceId?: string;
      referenceType?: StockMovementReferenceType;
      notes?: string;
      createdBy?: string;
    },
  ): Promise<{ movement: StockMovement; inventory: Inventory }> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'stock_movements', {
        product_id: productId,
        quantity_change: quantityChange,
        movement_type: movementType,
        reference_id: options?.referenceId,
        reference_type: options?.referenceType,
        notes: options?.notes,
        created_by: options?.createdBy,
      })
      .select()
      .single()) as { data: MovementRow | null; error: QueryError };

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to record stock movement');
    }

    const movement = toMovement(data);
    const inventory = await this.getInventory(tenantId, productId);
    return { movement, inventory };
  }

  async adjustStock(
    tenantId: string,
    dto: AdjustStockDto,
    createdBy?: string,
  ): Promise<{ movement: StockMovement; inventory: Inventory }> {
    return this.updateStock(
      tenantId,
      dto.productId,
      dto.adjustment,
      'adjustment' as StockMovementType,
      {
        referenceType: 'adjustment' as StockMovementReferenceType,
        notes: dto.notes ? `${dto.reason} — ${dto.notes}` : dto.reason,
        createdBy,
      },
    );
  }

  async bulkUpdateStock(
    tenantId: string,
    dto: BulkUpdateStockDto,
    createdBy?: string,
  ): Promise<BulkStockUpdateResult[]> {
    const results: BulkStockUpdateResult[] = [];

    for (const item of dto.items) {
      try {
        const { movement } = await this.updateStock(
          tenantId,
          item.productId,
          item.quantityChange,
          item.movementType,
          {
            referenceId: item.referenceId,
            referenceType: item.referenceType,
            notes: item.notes,
            createdBy,
          },
        );
        results.push({ productId: item.productId, success: true, movement });
      } catch (error) {
        results.push({
          productId: item.productId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async getMovements(
    tenantId: string,
    productId: string,
    query: ListMovementsDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService
      .selectTenant(tenantId, 'stock_movements', '*', { count: 'exact' })
      .eq('product_id', productId);

    if (query.movementType) {
      builder = builder.eq('movement_type', query.movementType);
    }

    if (query.from) {
      builder = builder.gte('created_at', query.from);
    }

    if (query.to) {
      builder = builder.lte('created_at', query.to);
    }

    const { data, error, count } = (await builder
      .order('created_at', { ascending: false })
      .range(from, to)) as unknown as {
      data: MovementRow[] | null;
      error: QueryError;
      count: number | null;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []).map(toMovement),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async getLowStockItems(
    tenantId: string,
    threshold?: number,
  ): Promise<(Inventory & { reorderLevel: number })[]> {
    const [
      { data: inventoryRows, error: inventoryError },
      { data: productRows, error: productError },
    ] = (await Promise.all([
      this.supabaseService.selectTenant(tenantId, 'inventory'),
      this.supabaseService.selectTenant(tenantId, 'products', 'id, reorder_level'),
    ])) as unknown as [
      { data: InventoryRow[] | null; error: QueryError },
      { data: { id: string; reorder_level: number }[] | null; error: QueryError },
    ];

    if (inventoryError || productError) {
      throw new NotFoundException(inventoryError?.message ?? productError?.message);
    }

    const reorderLevelByProduct = new Map((productRows ?? []).map((p) => [p.id, p.reorder_level]));

    return (inventoryRows ?? [])
      .map((row) => ({
        ...toInventory(row),
        reorderLevel: reorderLevelByProduct.get(row.product_id) ?? 0,
      }))
      .filter((item) => item.quantity <= (threshold ?? item.reorderLevel));
  }

  async validateStock(
    tenantId: string,
    dto: ValidateStockDto,
  ): Promise<{
    available: boolean;
    currentQuantity: number;
    requestedQuantity: number;
  }> {
    const inventory = await this.getInventory(tenantId, dto.productId).catch(() => null);
    const currentQuantity = inventory?.quantity ?? 0;

    return {
      available: currentQuantity >= dto.quantity,
      currentQuantity,
      requestedQuantity: dto.quantity,
    };
  }

  /**
   * The current schema has no `quantity_reserved` column, so reservations
   * aren't persisted — this only checks availability. Adding real
   * reservation tracking would require a schema change (a reserved-quantity
   * column) plus updating the RLS/trigger layer to account for it.
   */
  async reserveStock(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<{ reserved: boolean; currentQuantity: number; note: string }> {
    const { available, currentQuantity } = await this.validateStock(tenantId, {
      productId,
      quantity,
    });

    return {
      reserved: available,
      currentQuantity,
      note: 'Reservations are not persisted in the current schema; this only validates availability.',
    };
  }

  async releaseReservedStock(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<{ released: boolean; note: string }> {
    void quantity;
    await this.getInventory(tenantId, productId);

    return {
      released: true,
      note: 'Reservations are not persisted in the current schema; this is a no-op.',
    };
  }
}
