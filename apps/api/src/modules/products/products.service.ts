import type { PaginatedResult, PaginationParams, Product } from '@inventory-mgmt/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(
    organizationId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Product>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .range(from, to)
      .order(params.sortBy ?? 'created_at', { ascending: params.sortOrder === 'asc' });

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []) as unknown as Product[],
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async findOne(organizationId: string, id: string): Promise<Product> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return data as unknown as Product;
  }

  async create(organizationId: string, dto: CreateProductDto): Promise<Product> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .insert({
        organization_id: organizationId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category_id: dto.categoryId,
        supplier_id: dto.supplierId,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel ?? 0,
        reorder_quantity: dto.reorderQuantity ?? 0,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to create product');
    }

    return data as unknown as Product;
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(organizationId, id);

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .update({
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        category_id: dto.categoryId,
        supplier_id: dto.supplierId,
        unit_price: dto.unitPrice,
        cost_price: dto.costPrice,
        reorder_level: dto.reorderLevel,
        reorder_quantity: dto.reorderQuantity,
        is_active: dto.isActive,
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update product');
    }

    return data as unknown as Product;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id);

    const { error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);

    if (error) {
      throw new NotFoundException(error.message);
    }
  }
}
