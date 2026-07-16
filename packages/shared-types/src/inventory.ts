import type { Timestamps } from './common';

export interface Category extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  parentId: string | null;
}

export interface Supplier extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface Warehouse extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
}

export interface Product extends Timestamps {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId: string | null;
  supplierId: string | null;
  unitPrice: number;
  costPrice: number;
  reorderLevel: number;
  reorderQuantity: number;
  isActive: boolean;
}

export interface StockLevel {
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  updatedAt: string;
}

export enum StockMovementType {
  PURCHASE_RECEIPT = 'purchase_receipt',
  SALE_SHIPMENT = 'sale_shipment',
  ADJUSTMENT = 'adjustment',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  RETURN = 'return',
}

export interface StockMovement extends Timestamps {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  referenceId?: string | null;
  note?: string | null;
  createdBy: string;
}
