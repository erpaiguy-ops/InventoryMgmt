import type {
  NumberingSeries,
  OrgSettings,
  Tax,
  Uom,
  Warehouse,
} from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { CreateNumberingSeriesDto, UpdateNumberingSeriesDto } from './dto/numbering-series.dto';
import { UpdateOrgSettingsDto } from './dto/org-settings.dto';
import { CreateTaxDto, UpdateTaxDto } from './dto/tax.dto';
import { CreateUomDto, UpdateUomDto } from './dto/uom.dto';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

type QueryError = { message: string } | null;

interface TaxRow {
  id: string;
  name: string;
  rate: number;
  is_inclusive: boolean;
  is_active: boolean;
}
interface UomRow {
  id: string;
  code: string;
  name: string;
}
interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
}
interface SeriesRow {
  id: string;
  doc_type: string;
  prefix: string;
  next_number: number;
  padding: number;
}
interface OrgSettingsRow {
  tenant_id: string;
  currency: string;
  fiscal_year_start_month: number;
  document_footer: string | null;
  logo_path: string | null;
  updated_at: string;
}

const toTax = (r: TaxRow): Tax => ({
  id: r.id,
  name: r.name,
  rate: r.rate,
  isInclusive: r.is_inclusive,
  isActive: r.is_active,
});
const toUom = (r: UomRow): Uom => ({ id: r.id, code: r.code, name: r.name });
const toWarehouse = (r: WarehouseRow): Warehouse => ({
  id: r.id,
  code: r.code,
  name: r.name,
  address: r.address,
  isActive: r.is_active,
});
const toSeries = (r: SeriesRow): NumberingSeries => ({
  id: r.id,
  docType: r.doc_type,
  prefix: r.prefix,
  nextNumber: r.next_number,
  padding: r.padding,
});
const toOrgSettings = (r: OrgSettingsRow): OrgSettings => ({
  tenantId: r.tenant_id,
  currency: r.currency,
  fiscalYearStartMonth: r.fiscal_year_start_month,
  documentFooter: r.document_footer,
  logoPath: r.logo_path,
  updatedAt: r.updated_at,
});

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- taxes -----------------------------------------------------------------

  async listTaxes(tenantId: string): Promise<Tax[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'taxes')
      .order('name')) as unknown as { data: TaxRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toTax);
  }

  async createTax(tenantId: string, dto: CreateTaxDto): Promise<Tax> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'taxes', {
        name: dto.name,
        rate: dto.rate,
        is_inclusive: dto.isInclusive ?? false,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single()) as { data: TaxRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create tax');
    return toTax(data);
  }

  async updateTax(tenantId: string, id: string, dto: UpdateTaxDto): Promise<Tax> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'taxes', id, {
        name: dto.name,
        rate: dto.rate,
        is_inclusive: dto.isInclusive,
        is_active: dto.isActive,
      })
      .select()
      .maybeSingle()) as { data: TaxRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Tax ${id} not found`);
    return toTax(data);
  }

  async deleteTax(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'taxes', id);
    if (error) throw new ConflictException(error.message);
  }

  // --- uoms ------------------------------------------------------------------

  async listUoms(tenantId: string): Promise<Uom[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'uoms')
      .order('code')) as unknown as { data: UomRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toUom);
  }

  async createUom(tenantId: string, dto: CreateUomDto): Promise<Uom> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'uoms', { code: dto.code.toUpperCase(), name: dto.name })
      .select()
      .single()) as { data: UomRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create UoM');
    return toUom(data);
  }

  async updateUom(tenantId: string, id: string, dto: UpdateUomDto): Promise<Uom> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'uoms', id, { code: dto.code?.toUpperCase(), name: dto.name })
      .select()
      .maybeSingle()) as { data: UomRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `UoM ${id} not found`);
    return toUom(data);
  }

  async deleteUom(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'uoms', id);
    // FK restrict from items surfaces here as a conflict, with a clear message.
    if (error) throw new ConflictException('Cannot delete a unit that is in use by items');
  }

  // --- warehouses ------------------------------------------------------------

  async listWarehouses(tenantId: string): Promise<Warehouse[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'warehouses')
      .order('code')) as unknown as { data: WarehouseRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toWarehouse);
  }

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'warehouses', {
        code: dto.code.toUpperCase(),
        name: dto.name,
        address: dto.address,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single()) as { data: WarehouseRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create warehouse');
    return toWarehouse(data);
  }

  async updateWarehouse(tenantId: string, id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'warehouses', id, {
        code: dto.code?.toUpperCase(),
        name: dto.name,
        address: dto.address,
        is_active: dto.isActive,
      })
      .select()
      .maybeSingle()) as { data: WarehouseRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Warehouse ${id} not found`);
    return toWarehouse(data);
  }

  async deleteWarehouse(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'warehouses', id);
    if (error) throw new ConflictException('Cannot delete a warehouse that is in use');
  }

  // --- numbering series ------------------------------------------------------

  async listNumberingSeries(tenantId: string): Promise<NumberingSeries[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'numbering_series')
      .order('doc_type')) as unknown as { data: SeriesRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toSeries);
  }

  async createNumberingSeries(
    tenantId: string,
    dto: CreateNumberingSeriesDto,
  ): Promise<NumberingSeries> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'numbering_series', {
        doc_type: dto.docType,
        prefix: dto.prefix,
        next_number: dto.nextNumber ?? 1,
        padding: dto.padding ?? 4,
      })
      .select()
      .single()) as { data: SeriesRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create series');
    return toSeries(data);
  }

  async updateNumberingSeries(
    tenantId: string,
    id: string,
    dto: UpdateNumberingSeriesDto,
  ): Promise<NumberingSeries> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'numbering_series', id, {
        prefix: dto.prefix,
        next_number: dto.nextNumber,
        padding: dto.padding,
      })
      .select()
      .maybeSingle()) as { data: SeriesRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Series ${id} not found`);
    return toSeries(data);
  }

  // --- org settings ----------------------------------------------------------

  async getOrgSettings(tenantId: string): Promise<OrgSettings> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'org_settings')
      .maybeSingle()) as { data: OrgSettingsRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException('Organization settings not found');
    return toOrgSettings(data);
  }

  async updateOrgSettings(tenantId: string, dto: UpdateOrgSettingsDto): Promise<OrgSettings> {
    const { data: updated, error: updateError } = (await this.supabaseService
      .updateTenantSingleton(tenantId, 'org_settings', {
        currency: dto.currency,
        fiscal_year_start_month: dto.fiscalYearStartMonth,
        document_footer: dto.documentFooter,
      })
      .select()
      .maybeSingle()) as { data: OrgSettingsRow | null; error: QueryError };
    if (updateError || !updated) {
      throw new ConflictException(updateError?.message ?? 'Failed to update settings');
    }
    return toOrgSettings(updated);
  }
}
