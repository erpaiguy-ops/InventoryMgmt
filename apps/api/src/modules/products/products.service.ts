import type { PaginatedResult, PaginationParams, Product } from '@inventory-mgmt/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(params: PaginationParams): Promise<PaginatedResult<Product>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .select('*', { count: 'exact' })
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

  async findOne(id: string): Promise<Product> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return data as unknown as Product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .insert({
        sku: dto.sku,
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
      throw new NotFoundException(error?.message ?? 'Failed to create product');
    }

    return data as unknown as Product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('products')
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

    return data as unknown as Product;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const { error } = await this.supabaseService
      .getAdminClient()
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException(error.message);
    }
  }
}
