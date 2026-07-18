import type { Inventory, PaginatedResult, Product } from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { BulkCreateProductsDto } from './dto/bulk-create-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export type ProductWithInventory = Product & { inventory: Inventory | null };

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number | null;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

interface InventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  warehouse_location: string | null;
  last_updated: string;
}

type QueryError = { message: string } | null;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    unitPrice: row.unit_price,
    costPrice: row.cost_price,
    reorderLevel: row.reorder_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInventory(row: InventoryRow): Inventory {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    warehouseLocation: row.warehouse_location,
    lastUpdated: row.last_updated,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private generateSku(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SKU-${timestamp}-${random}`;
  }

  private async attachOneInventory(
    tenantId: string,
    product: Product,
  ): Promise<ProductWithInventory> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'inventory')
      .eq('product_id', product.id)
      .maybeSingle()) as { data: InventoryRow | null };

    return { ...product, inventory: data ? toInventory(data) : null };
  }

  private async attachInventory(
    tenantId: string,
    products: Product[],
  ): Promise<ProductWithInventory[]> {
    if (products.length === 0) {
      return [];
    }

    const { data, error } = (await this.supabaseService.selectTenant(tenantId, 'inventory').in(
      'product_id',
      products.map((p) => p.id),
    )) as { data: InventoryRow[] | null; error: QueryError };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const inventoryByProduct = new Map(
      (data ?? []).map((row) => [row.product_id, toInventory(row)]),
    );

    return products.map((product) => ({
      ...product,
      inventory: inventoryByProduct.get(product.id) ?? null,
    }));
  }

  async findAll(
    tenantId: string,
    query: ListProductsDto,
  ): Promise<PaginatedResult<ProductWithInventory>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.selectTenant(tenantId, 'products', '*', {
      count: 'exact',
    });

    if (query.search) {
      builder = builder.or(`name.ilike.%${query.search}%,sku.ilike.%${query.search}%`);
    }

    if (query.category) {
      builder = builder.eq('category', query.category);
    }

    const { data, error, count } = (await builder
      .order(query.sortBy ?? 'created_at', { ascending: query.sortOrder === 'asc' })
      .range(from, to)) as unknown as {
      data: ProductRow[] | null;
      error: QueryError;
      count: number | null;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(tenantId, products);
    const totalItems = count ?? 0;

    return {
      data: withInventory,
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(tenantId: string, id: string): Promise<ProductWithInventory> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'products')
      .eq('id', id)
      .maybeSingle()) as { data: ProductRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.attachOneInventory(tenantId, toProduct(data));
  }

  async findBySku(tenantId: string, sku: string): Promise<ProductWithInventory> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'products')
      .eq('sku', sku)
      .maybeSingle()) as { data: ProductRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return this.attachOneInventory(tenantId, toProduct(data));
  }

  async create(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'products', {
        sku: dto.sku?.trim() || this.generateSku(),
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel ?? 0,
      })
      .select()
      .single()) as { data: ProductRow | null; error: QueryError };

    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create product');
    }

    return toProduct(data);
  }

  async bulkCreate(tenantId: string, dto: BulkCreateProductsDto): Promise<Product[]> {
    const rows = dto.products.map((product) => ({
      sku: product.sku?.trim() || this.generateSku(),
      name: product.name,
      description: product.description,
      category: product.category,
      unit_price: product.unitPrice,
      cost_price: product.costPrice,
      reorder_level: product.reorderLevel ?? 0,
    }));

    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'products', rows)
      .select()) as { data: ProductRow[] | null; error: QueryError };

    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to bulk create products');
    }

    return data.map(toProduct);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'products', id, {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel,
      })
      .select()
      .maybeSingle()) as { data: ProductRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(error?.message ?? `Product ${id} not found`);
    }

    return toProduct(data);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    // Also proves the product belongs to this tenant before the reference
    // checks below, which query the (tenant-less) item tables by product id.
    await this.findOne(tenantId, id);

    const [{ count: poCount }, { count: soCount }] = await Promise.all([
      this.supabaseService
        .getItemsTable('purchase_order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id),
      this.supabaseService
        .getItemsTable('sales_order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id),
    ]);

    if ((poCount ?? 0) > 0 || (soCount ?? 0) > 0) {
      throw new ConflictException(
        'Cannot delete a product referenced by existing purchase or sales orders',
      );
    }

    const { error } = await this.supabaseService.deleteTenant(tenantId, 'products', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const { data, error } = (await this.supabaseService.selectTenant(
      tenantId,
      'products',
      'category',
    )) as unknown as {
      data: { category: string | null }[] | null;
      error: QueryError;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const categories = new Set(
      (data ?? [])
        .map((row) => row.category)
        .filter((category): category is string => Boolean(category)),
    );

    return [...categories].sort((a, b) => a.localeCompare(b));
  }

  async getLowStock(tenantId: string): Promise<ProductWithInventory[]> {
    const { data, error } = (await this.supabaseService.selectTenant(tenantId, 'products')) as {
      data: ProductRow[] | null;
      error: QueryError;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(tenantId, products);

    return withInventory.filter(
      (product) => product.inventory !== null && product.inventory.quantity <= product.reorderLevel,
    );
  }

  async getStockValue(tenantId: string): Promise<{
    totalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
  }> {
    const { data, error } = (await this.supabaseService.selectTenant(tenantId, 'products')) as {
      data: ProductRow[] | null;
      error: QueryError;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(tenantId, products);

    return withInventory.reduce(
      (totals, product) => {
        const quantity = product.inventory?.quantity ?? 0;
        return {
          totalUnits: totals.totalUnits + quantity,
          totalCostValue: totals.totalCostValue + quantity * (product.costPrice ?? 0),
          totalRetailValue: totals.totalRetailValue + quantity * product.unitPrice,
        };
      },
      { totalUnits: 0, totalCostValue: 0, totalRetailValue: 0 },
    );
  }
}
