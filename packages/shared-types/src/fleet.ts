/**
 * v2 Phase 7 shared types — Fleet & Logistics (roadmap M6).
 */

export interface Vehicle {
  id: string;
  docNo: string;
  regNo: string;
  name: string;
  ownership: 'owned' | 'rented';
  assetId: string | null;
  driverEmployeeId: string | null;
  driverName?: string;
  costCenterId: string | null;
  costCenterCode?: string;
  capacity: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  createdAt: string;
}

export type VehicleDocType = 'registration' | 'insurance' | 'permit' | 'inspection' | 'other';

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  vehicleRegNo?: string;
  docType: VehicleDocType;
  docRef: string | null;
  expiryDate: string | null;
  daysToExpiry: number | null;
  notes: string | null;
}

export type VehicleExpenseType = 'fuel' | 'maintenance' | 'rental' | 'toll' | 'other';

export interface VehicleExpense {
  id: string;
  docNo: string;
  vehicleId: string;
  vehicleRegNo?: string;
  expenseType: VehicleExpenseType;
  expenseDate: string;
  amount: number;
  odometer: number | null;
  quantity: number | null;
  description: string | null;
  status: 'draft' | 'posted';
  postedAt: string | null;
  createdAt: string;
}
