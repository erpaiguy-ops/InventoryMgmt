import type {
  Employee,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PayrollRun,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface EmployeePayload {
  fullName: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  joinDate?: string;
  isDriver?: boolean;
  basicSalary: number;
  allowances?: number;
  deductions?: number;
  costCenterId?: string;
  notes?: string;
}

export interface UpdateEmployeePayload extends Partial<EmployeePayload> {
  status?: 'active' | 'inactive';
}

export interface LeaveRequestPayload {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  reasonText?: string;
}

export const hrmService = {
  listEmployees: () => apiClient.get<Employee[]>('/hrm/employees'),
  createEmployee: (p: EmployeePayload) => apiClient.post<Employee>('/hrm/employees', p),
  updateEmployee: (id: string, p: UpdateEmployeePayload) =>
    apiClient.put<Employee>(`/hrm/employees/${id}`, p),

  listLeaveTypes: () => apiClient.get<LeaveType[]>('/hrm/leave-types'),
  listLeaveRequests: () => apiClient.get<LeaveRequest[]>('/hrm/leave-requests'),
  createLeaveRequest: (p: LeaveRequestPayload) =>
    apiClient.post<LeaveRequest[]>('/hrm/leave-requests', p),
  listLeaveBalances: () => apiClient.get<LeaveBalance[]>('/hrm/leave-balances'),

  listPayrollRuns: () => apiClient.get<PayrollRun[]>('/hrm/payroll-runs'),
  runPayroll: (runMonth: string, notes?: string) =>
    apiClient.post<PayrollRun>('/hrm/payroll-runs', { runMonth, notes }),
  payRun: (id: string, sourceAccountId: string) =>
    apiClient.post<PayrollRun>(`/hrm/payroll-runs/${id}/pay`, { sourceAccountId }),
};
