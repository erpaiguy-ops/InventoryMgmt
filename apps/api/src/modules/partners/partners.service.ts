import type {
  PaginatedResult,
  Partner,
  PartnerAddress,
  PartnerContact,
  PartnerGroup,
  PartnerWithDetails,
  PaymentTerm,
} from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import {
  BulkCreatePartnersDto,
  CreatePartnerDto,
  CreatePartnerGroupDto,
  CreatePaymentTermDto,
  ListPartnersDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

type QueryError = { message: string } | null;

interface PartnerRow {
  id: string;
  code: string | null;
  name: string;
  is_customer: boolean;
  is_supplier: boolean;
  tax_id_number: string | null;
  email: string | null;
  phone: string | null;
  currency: string | null;
  payment_term_id: string | null;
  credit_limit: number | null;
  price_list_id: string | null;
  group_id: string | null;
  status: 'active' | 'on_hold' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
interface ContactRow {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}
interface AddressRow {
  id: string;
  address_type: 'billing' | 'shipping';
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  is_default: boolean;
}
interface PaymentTermRow {
  id: string;
  name: string;
  net_days: number;
  early_pay_discount_pct: number | null;
  early_pay_within_days: number | null;
}
interface GroupRow {
  id: string;
  name: string;
}

function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isCustomer: row.is_customer,
    isSupplier: row.is_supplier,
    taxIdNumber: row.tax_id_number,
    email: row.email,
    phone: row.phone,
    currency: row.currency,
    paymentTermId: row.payment_term_id,
    creditLimit: row.credit_limit,
    priceListId: row.price_list_id,
    groupId: row.group_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const toContact = (r: ContactRow): PartnerContact => ({
  id: r.id,
  name: r.name,
  designation: r.designation,
  email: r.email,
  phone: r.phone,
  isPrimary: r.is_primary,
});
const toAddress = (r: AddressRow): PartnerAddress => ({
  id: r.id,
  addressType: r.address_type,
  line1: r.line1,
  line2: r.line2,
  city: r.city,
  state: r.state,
  country: r.country,
  postalCode: r.postal_code,
  isDefault: r.is_default,
});
const toPaymentTerm = (r: PaymentTermRow): PaymentTerm => ({
  id: r.id,
  name: r.name,
  netDays: r.net_days,
  earlyPayDiscountPct: r.early_pay_discount_pct,
  earlyPayWithinDays: r.early_pay_within_days,
});
const toGroup = (r: GroupRow): PartnerGroup => ({ id: r.id, name: r.name });

@Injectable()
export class PartnersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private partnerInsertRow(dto: CreatePartnerDto): Record<string, unknown> {
    return {
      code: dto.code?.trim() || null,
      name: dto.name,
      // A partner must be a customer, a supplier, or both; default new
      // partners to customer if the caller specified neither.
      is_customer: dto.isCustomer ?? !dto.isSupplier,
      is_supplier: dto.isSupplier ?? false,
      tax_id_number: dto.taxIdNumber,
      email: dto.email,
      phone: dto.phone,
      currency: dto.currency,
      payment_term_id: dto.paymentTermId,
      credit_limit: dto.creditLimit,
      price_list_id: dto.priceListId,
      group_id: dto.groupId,
      status: dto.status ?? 'active',
      notes: dto.notes,
    };
  }

  private async replaceChildren(
    tenantId: string,
    partnerId: string,
    dto: CreatePartnerDto | UpdatePartnerDto,
  ): Promise<void> {
    if (dto.contacts) {
      await this.supabaseService.deleteTenantWhere(
        tenantId,
        'partner_contacts',
        'partner_id',
        partnerId,
      );
      if (dto.contacts.length > 0) {
        const { error } = await this.supabaseService.insertTenant(
          tenantId,
          'partner_contacts',
          dto.contacts.map((c) => ({
            partner_id: partnerId,
            name: c.name,
            designation: c.designation,
            email: c.email,
            phone: c.phone,
            is_primary: c.isPrimary ?? false,
          })),
        );
        if (error) throw new BadRequestException(error.message);
      }
    }

    if (dto.addresses) {
      await this.supabaseService.deleteTenantWhere(
        tenantId,
        'partner_addresses',
        'partner_id',
        partnerId,
      );
      if (dto.addresses.length > 0) {
        const { error } = await this.supabaseService.insertTenant(
          tenantId,
          'partner_addresses',
          dto.addresses.map((a) => ({
            partner_id: partnerId,
            address_type: a.addressType,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            state: a.state,
            country: a.country,
            postal_code: a.postalCode,
            is_default: a.isDefault ?? false,
          })),
        );
        if (error) throw new BadRequestException(error.message);
      }
    }
  }

  async findAll(tenantId: string, query: ListPartnersDto): Promise<PaginatedResult<Partner>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.selectTenant(tenantId, 'partners', '*', {
      count: 'exact',
    });
    if (query.search) {
      builder = builder.or(
        `name.ilike.%${query.search}%,code.ilike.%${query.search}%,email.ilike.%${query.search}%`,
      );
    }
    if (query.role === 'customer') builder = builder.eq('is_customer', true);
    if (query.role === 'supplier') builder = builder.eq('is_supplier', true);
    if (query.status) builder = builder.eq('status', query.status);

    const { data, error, count } = (await builder.order('name').range(from, to)) as unknown as {
      data: PartnerRow[] | null;
      error: QueryError;
      count: number | null;
    };
    if (error) throw new NotFoundException(error.message);

    const totalItems = count ?? 0;
    return {
      data: (data ?? []).map(toPartner),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(tenantId: string, id: string): Promise<PartnerWithDetails> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'partners')
      .eq('id', id)
      .maybeSingle()) as { data: PartnerRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(`Partner ${id} not found`);

    const [{ data: contacts }, { data: addresses }] = (await Promise.all([
      this.supabaseService.selectTenant(tenantId, 'partner_contacts').eq('partner_id', id),
      this.supabaseService.selectTenant(tenantId, 'partner_addresses').eq('partner_id', id),
    ])) as unknown as [{ data: ContactRow[] | null }, { data: AddressRow[] | null }];

    return {
      ...toPartner(data),
      contacts: (contacts ?? []).map(toContact),
      addresses: (addresses ?? []).map(toAddress),
    };
  }

  async create(tenantId: string, dto: CreatePartnerDto): Promise<PartnerWithDetails> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'partners', this.partnerInsertRow(dto))
      .select()
      .single()) as { data: PartnerRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create partner');

    await this.replaceChildren(tenantId, data.id, dto);
    return this.findOne(tenantId, data.id);
  }

  async bulkCreate(tenantId: string, dto: BulkCreatePartnersDto): Promise<{ created: number }> {
    if (dto.partners.length === 0) return { created: 0 };
    const { data, error } = (await this.supabaseService
      .insertTenant(
        tenantId,
        'partners',
        dto.partners.map((p) => this.partnerInsertRow(p)),
      )
      .select('id')) as { data: { id: string }[] | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Bulk import failed');
    return { created: data.length };
  }

  async update(tenantId: string, id: string, dto: UpdatePartnerDto): Promise<PartnerWithDetails> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'partners', id, {
        code: dto.code?.trim(),
        name: dto.name,
        is_customer: dto.isCustomer,
        is_supplier: dto.isSupplier,
        tax_id_number: dto.taxIdNumber,
        email: dto.email,
        phone: dto.phone,
        currency: dto.currency,
        payment_term_id: dto.paymentTermId,
        credit_limit: dto.creditLimit,
        price_list_id: dto.priceListId,
        group_id: dto.groupId,
        status: dto.status,
        notes: dto.notes,
      })
      .select()
      .maybeSingle()) as { data: PartnerRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Partner ${id} not found`);

    await this.replaceChildren(tenantId, id, dto);
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'partners', id);
    if (error) {
      throw new ConflictException(
        'Cannot delete a partner that is referenced elsewhere — archive it instead',
      );
    }
  }

  // --- payment terms ----------------------------------------------------------

  async listPaymentTerms(tenantId: string): Promise<PaymentTerm[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'payment_terms')
      .order('net_days')) as unknown as { data: PaymentTermRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toPaymentTerm);
  }

  async createPaymentTerm(tenantId: string, dto: CreatePaymentTermDto): Promise<PaymentTerm> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'payment_terms', {
        name: dto.name,
        net_days: dto.netDays,
        early_pay_discount_pct: dto.earlyPayDiscountPct,
        early_pay_within_days: dto.earlyPayWithinDays,
      })
      .select()
      .single()) as { data: PaymentTermRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create payment term');
    }
    return toPaymentTerm(data);
  }

  async deletePaymentTerm(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'payment_terms', id);
    if (error) throw new ConflictException('Cannot delete a payment term that is in use');
  }

  // --- partner groups ---------------------------------------------------------

  async listGroups(tenantId: string): Promise<PartnerGroup[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'partner_groups')
      .order('name')) as unknown as { data: GroupRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toGroup);
  }

  async createGroup(tenantId: string, dto: CreatePartnerGroupDto): Promise<PartnerGroup> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'partner_groups', { name: dto.name })
      .select()
      .single()) as { data: GroupRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create group');
    return toGroup(data);
  }

  async deleteGroup(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'partner_groups', id);
    if (error) throw new ConflictException(error.message);
  }
}
