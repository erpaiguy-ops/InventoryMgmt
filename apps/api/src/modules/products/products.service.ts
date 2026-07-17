import type { Inventory, PaginatedResult, Product } from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { BulkCreateProductsDto } from './dto/bulk-create-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export type ProductWithInventory = Product & { inventory: Inventory | null };

function toProduct(row: {
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
}): Product {
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

function toInventory(row: {
  id: string;
  product_id: string;
  quantity: number;
  warehouse_location: string | null;
  last_updated: string;
}): Inventory {
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

  private async attachOneInventory(product: Product): Promise<ProductWithInventory> {
    const { data } = await this.supabaseService
      .getTable('inventory')
      .select('*')
      .eq('product_id', product.id)
      .maybeSingle();

    return { ...product, inventory: data ? toInventory(data) : null };
  }

  private async attachInventory(products: Product[]): Promise<ProductWithInventory[]> {
    if (products.length === 0) {
      return [];
    }

    const { data, error } = await this.supabaseService
      .getTable('inventory')
      .select('*')
      .in(
        'product_id',
        products.map((p) => p.id),
      );

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

  async findAll(query: ListProductsDto): Promise<PaginatedResult<ProductWithInventory>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.getTable('products').select('*', { count: 'exact' });

    if (query.search) {
      builder = builder.or(`name.ilike.%${query.search}%,sku.ilike.%${query.search}%`);
    }

    if (query.category) {
      builder = builder.eq('category', query.category);
    }

    const { data, error, count } = await builder
      .order(query.sortBy ?? 'created_at', { ascending: query.sortOrder === 'asc' })
      .range(from, to);

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(products);
    const totalItems = count ?? 0;

    return {
      data: withInventory,
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(id: string): Promise<ProductWithInventory> {
    const { data, error } = await this.supabaseService
      .getTable('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.attachOneInventory(toProduct(data));
  }

  async findBySku(sku: string): Promise<ProductWithInventory> {
    const { data, error } = await this.supabaseService
      .getTable('products')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return this.attachOneInventory(toProduct(data));
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { data, error } = await this.supabaseService
      .getTable('products')
      .insert({
        sku: dto.sku?.trim() || this.generateSku(),
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel ?? 0,
      })
      .select()
      .single();

    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create product');
    }

    return toProduct(data);
  }

  async bulkCreate(dto: BulkCreateProductsDto): Promise<Product[]> {
    const { data, error } = await this.supabaseService
      .getTable('products')
      .insert(
        dto.products.map((product) => ({
          sku: product.sku?.trim() || this.generateSku(),
          name: product.name,
          description: product.description,
          category: product.category,
          unit_price: product.unitPrice,
          cost_price: product.costPrice,
          reorder_level: product.reorderLevel ?? 0,
        })),
      )
      .select();

    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to bulk create products');
    }

    return data.map(toProduct);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);

    const { data, error } = await this.supabaseService
      .getTable('products')
      .update({
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update product');
    }

    return toProduct(data);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const [{ count: poCount }, { count: soCount }] = await Promise.all([
      this.supabaseService
        .getTable('purchase_order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id),
      this.supabaseService
        .getTable('sales_order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id),
    ]);

    if ((poCount ?? 0) > 0 || (soCount ?? 0) > 0) {
      throw new ConflictException(
        'Cannot delete a product referenced by existing purchase or sales orders',
      );
    }

    const { error } = await this.supabaseService.getTable('products').delete().eq('id', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabaseService.getTable('products').select('category');

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

  async getLowStock(): Promise<ProductWithInventory[]> {
    const { data, error } = await this.supabaseService.getTable('products').select('*');

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(products);

    return withInventory.filter(
      (product) => product.inventory !== null && product.inventory.quantity <= product.reorderLevel,
    );
  }

  async getStockValue(): Promise<{
    totalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
  }> {
    const { data, error } = await this.supabaseService.getTable('products').select('*');

    if (error) {
      throw new NotFoundException(error.message);
    }

    const products = (data ?? []).map(toProduct);
    const withInventory = await this.attachInventory(products);

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
