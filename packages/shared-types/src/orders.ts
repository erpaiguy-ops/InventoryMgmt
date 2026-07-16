import type { Timestamps } from './common';

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder extends Timestamps {
  id: string;
  organizationId: string;
  supplierId: string;
  warehouseId: string;
  status: OrderStatus;
  lines: PurchaseOrderLine[];
  expectedAt?: string | null;
  createdBy: string;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Customer extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface SalesOrder extends Timestamps {
  id: string;
  organizationId: string;
  customerId: string;
  warehouseId: string;
  status: OrderStatus;
  lines: SalesOrderLine[];
  createdBy: string;
}
