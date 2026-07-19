/**
 * v2 Phase 2R shared types — master data & tenant backbone (roadmap M12/M1/M2).
 * CamelCase API shapes shared byte-for-byte between the NestJS backend and the
 * Next.js frontend; snake_case DB rows are mapped in the API services.
 */

// ---------------------------------------------------------------------------
// Settings backbone (M12)
// ---------------------------------------------------------------------------

export interface OrgSettings {
  tenantId: string;
  currency: string;
  fiscalYearStartMonth: number;
  documentFooter: string | null;
  logoPath: string | null;
  updatedAt: string;
}

export interface NumberingSeries {
  id: string;
  docType: string;
  prefix: string;
  nextNumber: number;
  padding: number;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  isActive: boolean;
}

export interface Uom {
  id: string;
  code: string;
  name: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// M1 — Item Catalog
// ---------------------------------------------------------------------------

export type ItemTracking = 'none' | 'batch' | 'serial';
export type ItemStatus = 'draft' | 'active' | 'discontinued';
export type ItemType = 'stocked' | 'service';

/** One field definition inside a category's attribute schema. */
export interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date';
}

export interface ItemCategory {
  id: string;
  parentId: string | null;
  name: string;
  attributeSchema: CategoryAttribute[];
}

export interface Brand {
  id: string;
  name: string;
}

export interface ItemUomConversion {
  id: string;
  uomId: string;
  factorToBase: number;
}

export interface ItemBarcode {
  id: string;
  barcode: string;
  uomId: string | null;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  itemType: ItemType;
  categoryId: string | null;
  brandId: string | null;
  parentItemId: string | null;
  baseUomId: string;
  purchaseUomId: string | null;
  salesUomId: string | null;
  taxId: string | null;
  tracking: ItemTracking;
  trackExpiry: boolean;
  attributes: Record<string, unknown>;
  standardCost: number | null;
  standardPrice: number | null;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ItemWithDetails extends Item {
  uoms: ItemUomConversion[];
  barcodes: ItemBarcode[];
}

export type PriceListType = 'sales' | 'purchase';

export interface PriceList {
  id: string;
  name: string;
  listType: PriceListType;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  itemId: string;
  uomId: string | null;
  minQty: number;
  unitPrice: number;
  validFrom: string | null;
  validTo: string | null;
}

// ---------------------------------------------------------------------------
// M2 — Business Partners
// ---------------------------------------------------------------------------

export type PartnerStatus = 'active' | 'on_hold' | 'archived';

export interface PaymentTerm {
  id: string;
  name: string;
  netDays: number;
  earlyPayDiscountPct: number | null;
  earlyPayWithinDays: number | null;
}

export interface PartnerGroup {
  id: string;
  name: string;
}

export interface PartnerContact {
  id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export type PartnerAddressType = 'billing' | 'shipping';

export interface PartnerAddress {
  id: string;
  addressType: PartnerAddressType;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export interface Partner {
  id: string;
  code: string | null;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
  taxIdNumber: string | null;
  email: string | null;
  phone: string | null;
  currency: string | null;
  paymentTermId: string | null;
  creditLimit: number | null;
  priceListId: string | null;
  groupId: string | null;
  status: PartnerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerWithDetails extends Partner {
  contacts: PartnerContact[];
  addresses: PartnerAddress[];
}
