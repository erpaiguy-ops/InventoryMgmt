/**
 * v2 Phase 7 shared types — HRM & Payroll (roadmap M9).
 */

export interface Employee {
  id: string;
  empNo: string;
  fullName: string;
  profileId: string | null;
  department: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  joinDate: string | null;
  isDriver: boolean;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  costCenterId: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  createdAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
  isPaid: boolean;
}

export interface LeaveRequest {
  id: string;
  docNo: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  reasonText: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName?: string;
  empNo?: string;
  basic: number;
  allowances: number;
  deductions: number;
  netPay: number;
  costCenterId: string | null;
}

export interface PayrollRun {
  id: string;
  docNo: string;
  runMonth: string;
  status: 'draft' | 'posted' | 'paid';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  notes: string | null;
  postedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  payslips: Payslip[];
}
