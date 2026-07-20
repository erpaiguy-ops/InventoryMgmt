'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fleetService,
  type UpdateVehiclePayload,
  type VehicleDocumentPayload,
  type VehicleExpensePayload,
  type VehiclePayload,
} from '@/services/fleet.service';

const FLEET = 'fleet';

function useInvalidateFleet() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [FLEET] });
    void queryClient.invalidateQueries({ queryKey: ['financials'] });
  };
}

export function useVehicles() {
  return useQuery({ queryKey: [FLEET, 'vehicles'], queryFn: () => fleetService.listVehicles() });
}

export function useCreateVehicle() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: (p: VehiclePayload) => fleetService.createVehicle(p),
    onSuccess: invalidate,
  });
}

export function useUpdateVehicle() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & UpdateVehiclePayload) =>
      fleetService.updateVehicle(id, p),
    onSuccess: invalidate,
  });
}

export function useVehicleDocuments(vehicleId?: string) {
  return useQuery({
    queryKey: [FLEET, 'documents', vehicleId],
    queryFn: () => fleetService.listDocuments(vehicleId),
  });
}

export function useCreateVehicleDocument() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: (p: VehicleDocumentPayload) => fleetService.createDocument(p),
    onSuccess: invalidate,
  });
}

export function useVehicleExpenses(vehicleId?: string) {
  return useQuery({
    queryKey: [FLEET, 'expenses', vehicleId],
    queryFn: () => fleetService.listExpenses(vehicleId),
  });
}

export function useCreateVehicleExpense() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: (p: VehicleExpensePayload) => fleetService.createExpense(p),
    onSuccess: invalidate,
  });
}
