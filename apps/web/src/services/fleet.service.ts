import type { Vehicle, VehicleDocument, VehicleExpense } from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface VehiclePayload {
  regNo: string;
  name: string;
  ownership: 'owned' | 'rented';
  assetId?: string;
  driverEmployeeId?: string;
  capacity?: string;
  notes?: string;
}

export interface UpdateVehiclePayload {
  name?: string;
  driverEmployeeId?: string;
  capacity?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface VehicleDocumentPayload {
  vehicleId: string;
  docType: VehicleDocument['docType'];
  docRef?: string;
  expiryDate?: string;
  notes?: string;
}

export interface VehicleExpensePayload {
  vehicleId: string;
  expenseType: VehicleExpense['expenseType'];
  expenseDate?: string;
  amount: number;
  odometer?: number;
  quantity?: number;
  description?: string;
  creditAccountId: string;
}

export const fleetService = {
  listVehicles: () => apiClient.get<Vehicle[]>('/fleet/vehicles'),
  createVehicle: (p: VehiclePayload) => apiClient.post<Vehicle>('/fleet/vehicles', p),
  updateVehicle: (id: string, p: UpdateVehiclePayload) =>
    apiClient.put<Vehicle>(`/fleet/vehicles/${id}`, p),

  listDocuments: (vehicleId?: string) =>
    apiClient.get<VehicleDocument[]>(
      `/fleet/documents${vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : ''}`,
    ),
  createDocument: (p: VehicleDocumentPayload) =>
    apiClient.post<VehicleDocument[]>('/fleet/documents', p),

  listExpenses: (vehicleId?: string) =>
    apiClient.get<VehicleExpense[]>(
      `/fleet/expenses${vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : ''}`,
    ),
  createExpense: (p: VehicleExpensePayload) =>
    apiClient.post<VehicleExpense[]>('/fleet/expenses', p),
};
