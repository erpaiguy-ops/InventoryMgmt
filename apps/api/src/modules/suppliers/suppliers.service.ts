import type { PaginatedResult, Supplier } from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

type QueryError = { message: string } | null;

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SuppliersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(tenantId: string, query: ListSuppliersDto): Promise<PaginatedResult<Supplier>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.selectTenant(tenantId, 'suppliers', '*', {
      count: 'exact',
    });

    if (query.search) {
      builder = builder.or(`name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
    }

    const { data, error, count } = (await builder
      .order('name', { ascending: true })
      .range(from, to)) as unknown as {
      data: SupplierRow[] | null;
      error: QueryError;
      count: number | null;
    };

    if (error) {
      throw new NotFoundException(error.message);
    }

    const totalItems = count ?? 0;

    return {
      data: (data ?? []).map(toSupplier),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(tenantId: string, id: string): Promise<Supplier> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'suppliers')
      .eq('id', id)
      .maybeSingle()) as { data: SupplierRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return toSupplier(data);
  }

  async create(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'suppliers', {
        name: dto.name,
        contact_person: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      })
      .select()
      .single()) as { data: SupplierRow | null; error: QueryError };

    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create supplier');
    }

    return toSupplier(data);
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'suppliers', id, {
        name: dto.name,
        contact_person: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      })
      .select()
      .maybeSingle()) as { data: SupplierRow | null; error: QueryError };

    if (error || !data) {
      throw new NotFoundException(error?.message ?? `Supplier ${id} not found`);
    }

    return toSupplier(data);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    const { count } = await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders', 'id', { count: 'exact', head: true })
      .eq('supplier_id', id);

    if ((count ?? 0) > 0) {
      throw new ConflictException(
        'Cannot delete a supplier referenced by existing purchase orders',
      );
    }

    const { error } = await this.supabaseService.deleteTenant(tenantId, 'suppliers', id);

    if (error) {
      throw new ConflictException(error.message);
    }
  }
}
