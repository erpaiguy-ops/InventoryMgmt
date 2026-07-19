import type {
  Brand,
  CategoryAttribute,
  Item,
  ItemBarcode,
  ItemCategory,
  ItemUomConversion,
  ItemWithDetails,
  PaginatedResult,
  PriceList,
  PriceListItem,
} from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { CreateBrandDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { BulkCreateItemsDto, CreateItemDto, ListItemsDto, UpdateItemDto } from './dto/item.dto';
import { CreatePriceListDto, SetPriceListItemsDto, UpdatePriceListDto } from './dto/price-list.dto';

type QueryError = { message: string } | null;

interface ItemRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  item_type: 'stocked' | 'service';
  category_id: string | null;
  brand_id: string | null;
  parent_item_id: string | null;
  base_uom_id: string;
  purchase_uom_id: string | null;
  sales_uom_id: string | null;
  tax_id: string | null;
  tracking: 'none' | 'batch' | 'serial';
  track_expiry: boolean;
  attributes: Record<string, unknown>;
  standard_cost: number | null;
  standard_price: number | null;
  status: 'draft' | 'active' | 'discontinued';
  created_at: string;
  updated_at: string;
}
interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  attribute_schema: CategoryAttribute[];
}
interface BrandRow {
  id: string;
  name: string;
}
interface ItemUomRow {
  id: string;
  uom_id: string;
  factor_to_base: number;
}
interface BarcodeRow {
  id: string;
  barcode: string;
  uom_id: string | null;
}
interface PriceListRow {
  id: string;
  name: string;
  list_type: 'sales' | 'purchase';
  currency: string;
  is_default: boolean;
  is_active: boolean;
}
interface PriceListItemRow {
  id: string;
  price_list_id: string;
  item_id: string;
  uom_id: string | null;
  min_qty: number;
  unit_price: number;
  valid_from: string | null;
  valid_to: string | null;
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    categoryId: row.category_id,
    brandId: row.brand_id,
    parentItemId: row.parent_item_id,
    baseUomId: row.base_uom_id,
    purchaseUomId: row.purchase_uom_id,
    salesUomId: row.sales_uom_id,
    taxId: row.tax_id,
    tracking: row.tracking,
    trackExpiry: row.track_expiry,
    attributes: row.attributes ?? {},
    standardCost: row.standard_cost,
    standardPrice: row.standard_price,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const toCategory = (r: CategoryRow): ItemCategory => ({
  id: r.id,
  parentId: r.parent_id,
  name: r.name,
  attributeSchema: r.attribute_schema ?? [],
});
const toBrand = (r: BrandRow): Brand => ({ id: r.id, name: r.name });
const toItemUom = (r: ItemUomRow): ItemUomConversion => ({
  id: r.id,
  uomId: r.uom_id,
  factorToBase: r.factor_to_base,
});
const toBarcode = (r: BarcodeRow): ItemBarcode => ({
  id: r.id,
  barcode: r.barcode,
  uomId: r.uom_id,
});
const toPriceList = (r: PriceListRow): PriceList => ({
  id: r.id,
  name: r.name,
  listType: r.list_type,
  currency: r.currency,
  isDefault: r.is_default,
  isActive: r.is_active,
});
const toPriceListItem = (r: PriceListItemRow): PriceListItem => ({
  id: r.id,
  priceListId: r.price_list_id,
  itemId: r.item_id,
  uomId: r.uom_id,
  minQty: r.min_qty,
  unitPrice: r.unit_price,
  validFrom: r.valid_from,
  validTo: r.valid_to,
});

@Injectable()
export class ItemsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private generateSku(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `SKU-${timestamp}-${random}`;
  }

  private itemInsertRow(dto: CreateItemDto): Record<string, unknown> {
    return {
      sku: dto.sku?.trim() || this.generateSku(),
      name: dto.name,
      description: dto.description,
      item_type: dto.itemType ?? 'stocked',
      category_id: dto.categoryId,
      brand_id: dto.brandId,
      parent_item_id: dto.parentItemId,
      base_uom_id: dto.baseUomId,
      purchase_uom_id: dto.purchaseUomId,
      sales_uom_id: dto.salesUomId,
      tax_id: dto.taxId,
      tracking: dto.tracking ?? 'none',
      track_expiry: dto.trackExpiry ?? false,
      attributes: dto.attributes ?? {},
      standard_cost: dto.standardCost,
      standard_price: dto.standardPrice,
      status: dto.status ?? 'active',
    };
  }

  private async replaceItemChildren(
    tenantId: string,
    itemId: string,
    dto: CreateItemDto | UpdateItemDto,
  ): Promise<void> {
    if (dto.uoms) {
      await this.supabaseService.deleteTenantWhere(tenantId, 'item_uoms', 'item_id', itemId);
      if (dto.uoms.length > 0) {
        const { error } = await this.supabaseService.insertTenant(
          tenantId,
          'item_uoms',
          dto.uoms.map((u) => ({
            item_id: itemId,
            uom_id: u.uomId,
            factor_to_base: u.factorToBase,
          })),
        );
        if (error) throw new BadRequestException(error.message);
      }
    }

    if (dto.barcodes) {
      await this.supabaseService.deleteTenantWhere(tenantId, 'item_barcodes', 'item_id', itemId);
      if (dto.barcodes.length > 0) {
        const { error } = await this.supabaseService.insertTenant(
          tenantId,
          'item_barcodes',
          dto.barcodes.map((b) => ({ item_id: itemId, barcode: b.barcode, uom_id: b.uomId })),
        );
        if (error) throw new BadRequestException(error.message);
      }
    }
  }

  async findAll(tenantId: string, query: ListItemsDto): Promise<PaginatedResult<Item>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder = this.supabaseService.selectTenant(tenantId, 'items', '*', { count: 'exact' });
    if (query.search) {
      builder = builder.or(`name.ilike.%${query.search}%,sku.ilike.%${query.search}%`);
    }
    if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
    if (query.status) builder = builder.eq('status', query.status);

    const { data, error, count } = (await builder.order('name').range(from, to)) as unknown as {
      data: ItemRow[] | null;
      error: QueryError;
      count: number | null;
    };
    if (error) throw new NotFoundException(error.message);

    const totalItems = count ?? 0;
    return {
      data: (data ?? []).map(toItem),
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOne(tenantId: string, id: string): Promise<ItemWithDetails> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'items')
      .eq('id', id)
      .maybeSingle()) as { data: ItemRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(`Item ${id} not found`);

    const [{ data: uoms }, { data: barcodes }] = (await Promise.all([
      this.supabaseService.selectTenant(tenantId, 'item_uoms').eq('item_id', id),
      this.supabaseService.selectTenant(tenantId, 'item_barcodes').eq('item_id', id),
    ])) as unknown as [{ data: ItemUomRow[] | null }, { data: BarcodeRow[] | null }];

    return {
      ...toItem(data),
      uoms: (uoms ?? []).map(toItemUom),
      barcodes: (barcodes ?? []).map(toBarcode),
    };
  }

  async create(tenantId: string, dto: CreateItemDto): Promise<ItemWithDetails> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'items', this.itemInsertRow(dto))
      .select()
      .single()) as { data: ItemRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create item');

    await this.replaceItemChildren(tenantId, data.id, dto);
    return this.findOne(tenantId, data.id);
  }

  async bulkCreate(tenantId: string, dto: BulkCreateItemsDto): Promise<{ created: number }> {
    if (dto.items.length === 0) return { created: 0 };
    const { data, error } = (await this.supabaseService
      .insertTenant(
        tenantId,
        'items',
        dto.items.map((i) => this.itemInsertRow(i)),
      )
      .select('id')) as { data: { id: string }[] | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Bulk import failed');
    return { created: data.length };
  }

  async update(tenantId: string, id: string, dto: UpdateItemDto): Promise<ItemWithDetails> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'items', id, {
        sku: dto.sku?.trim() || undefined,
        name: dto.name,
        description: dto.description,
        item_type: dto.itemType,
        category_id: dto.categoryId,
        brand_id: dto.brandId,
        parent_item_id: dto.parentItemId,
        base_uom_id: dto.baseUomId,
        purchase_uom_id: dto.purchaseUomId,
        sales_uom_id: dto.salesUomId,
        tax_id: dto.taxId,
        tracking: dto.tracking,
        track_expiry: dto.trackExpiry,
        attributes: dto.attributes,
        standard_cost: dto.standardCost,
        standard_price: dto.standardPrice,
        status: dto.status,
      })
      .select()
      .maybeSingle()) as { data: ItemRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Item ${id} not found`);

    await this.replaceItemChildren(tenantId, id, dto);
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'items', id);
    if (error) {
      throw new ConflictException(
        'Cannot delete an item that is referenced elsewhere — discontinue it instead',
      );
    }
  }

  // --- categories ------------------------------------------------------------

  async listCategories(tenantId: string): Promise<ItemCategory[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'item_categories')
      .order('name')) as unknown as { data: CategoryRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toCategory);
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto): Promise<ItemCategory> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'item_categories', {
        name: dto.name,
        parent_id: dto.parentId,
        attribute_schema: dto.attributeSchema ?? [],
      })
      .select()
      .single()) as { data: CategoryRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create category');
    return toCategory(data);
  }

  async updateCategory(
    tenantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<ItemCategory> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'item_categories', id, {
        name: dto.name,
        parent_id: dto.parentId,
        attribute_schema: dto.attributeSchema,
      })
      .select()
      .maybeSingle()) as { data: CategoryRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Category ${id} not found`);
    return toCategory(data);
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'item_categories', id);
    if (error) throw new ConflictException(error.message);
  }

  // --- brands ----------------------------------------------------------------

  async listBrands(tenantId: string): Promise<Brand[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'brands')
      .order('name')) as unknown as { data: BrandRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toBrand);
  }

  async createBrand(tenantId: string, dto: CreateBrandDto): Promise<Brand> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'brands', { name: dto.name })
      .select()
      .single()) as { data: BrandRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create brand');
    return toBrand(data);
  }

  async deleteBrand(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService.deleteTenant(tenantId, 'brands', id);
    if (error) throw new ConflictException(error.message);
  }

  // --- price lists -----------------------------------------------------------

  async listPriceLists(tenantId: string): Promise<PriceList[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'price_lists')
      .order('name')) as unknown as { data: PriceListRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toPriceList);
  }

  async createPriceList(tenantId: string, dto: CreatePriceListDto): Promise<PriceList> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'price_lists', {
        name: dto.name,
        list_type: dto.listType,
        currency: dto.currency ?? 'USD',
        is_default: dto.isDefault ?? false,
        is_active: dto.isActive ?? true,
      })
      .select()
      .single()) as { data: PriceListRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create price list');
    }
    return toPriceList(data);
  }

  async updatePriceList(tenantId: string, id: string, dto: UpdatePriceListDto): Promise<PriceList> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'price_lists', id, {
        name: dto.name,
        currency: dto.currency,
        is_default: dto.isDefault,
        is_active: dto.isActive,
      })
      .select()
      .maybeSingle()) as { data: PriceListRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Price list ${id} not found`);
    return toPriceList(data);
  }

  async listPriceListItems(tenantId: string, priceListId: string): Promise<PriceListItem[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'price_list_items')
      .eq('price_list_id', priceListId)
      .order('created_at')) as unknown as { data: PriceListItemRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toPriceListItem);
  }

  /** Replaces the full price set of one list — the UI edits prices as a sheet, not row by row. */
  async setPriceListItems(
    tenantId: string,
    priceListId: string,
    dto: SetPriceListItemsDto,
  ): Promise<PriceListItem[]> {
    // Verify the list belongs to this tenant before touching its rows.
    const { data: list } = (await this.supabaseService
      .selectTenant(tenantId, 'price_lists', 'id')
      .eq('id', priceListId)
      .maybeSingle()) as { data: { id: string } | null };
    if (!list) throw new NotFoundException(`Price list ${priceListId} not found`);

    await this.supabaseService.deleteTenantWhere(
      tenantId,
      'price_list_items',
      'price_list_id',
      priceListId,
    );

    if (dto.prices.length > 0) {
      const { error } = await this.supabaseService.insertTenant(
        tenantId,
        'price_list_items',
        dto.prices.map((p) => ({
          price_list_id: priceListId,
          item_id: p.itemId,
          uom_id: p.uomId,
          min_qty: p.minQty ?? 1,
          unit_price: p.unitPrice,
          valid_from: p.validFrom,
          valid_to: p.validTo,
        })),
      );
      if (error) throw new BadRequestException(error.message);
    }

    return this.listPriceListItems(tenantId, priceListId);
  }
}
