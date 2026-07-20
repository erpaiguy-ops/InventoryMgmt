'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hrmService,
  type EmployeePayload,
  type LeaveRequestPayload,
  type UpdateEmployeePayload,
} from '@/services/hrm.service';

const HRM = 'hrm';

function useInvalidateHrm() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [HRM] });
    void queryClient.invalidateQueries({ queryKey: ['financials'] });
    void queryClient.invalidateQueries({ queryKey: ['approvals'] });
  };
}

export function useEmployees() {
  return useQuery({ queryKey: [HRM, 'employees'], queryFn: () => hrmService.listEmployees() });
}

export function useCreateEmployee() {
  const invalidate = useInvalidateHrm();
  return useMutation({
    mutationFn: (p: EmployeePayload) => hrmService.createEmployee(p),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateHrm();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & UpdateEmployeePayload) =>
      hrmService.updateEmployee(id, p),
    onSuccess: invalidate,
  });
}

export function useLeaveTypes() {
  return useQuery({ queryKey: [HRM, 'leave-types'], queryFn: () => hrmService.listLeaveTypes() });
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: [HRM, 'leave-requests'],
    queryFn: () => hrmService.listLeaveRequests(),
  });
}

export function useCreateLeaveRequest() {
  const invalidate = useInvalidateHrm();
  return useMutation({
    mutationFn: (p: LeaveRequestPayload) => hrmService.createLeaveRequest(p),
    onSuccess: invalidate,
  });
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: [HRM, 'payroll-runs'],
    queryFn: () => hrmService.listPayrollRuns(),
  });
}

export function useRunPayroll() {
  const invalidate = useInvalidateHrm();
  return useMutation({
    mutationFn: ({ runMonth, notes }: { runMonth: string; notes?: string }) =>
      hrmService.runPayroll(runMonth, notes),
    onSuccess: invalidate,
  });
}

export function usePayPayrollRun() {
  const invalidate = useInvalidateHrm();
  return useMutation({
    mutationFn: ({ id, sourceAccountId }: { id: string; sourceAccountId: string }) =>
      hrmService.payRun(id, sourceAccountId),
    onSuccess: invalidate,
  });
}
