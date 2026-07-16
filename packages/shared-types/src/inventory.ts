export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitPrice: number;
  costPrice: number | null;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  warehouseLocation: string | null;
  lastUpdated: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

export enum StockMovementReferenceType {
  PURCHASE_ORDER = 'purchase_order',
  SALES_ORDER = 'sales_order',
  ADJUSTMENT = 'adjustment',
}

export interface StockMovement {
  id: string;
  productId: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  movementType: StockMovementType;
  referenceId: string | null;
  referenceType: StockMovementReferenceType | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
