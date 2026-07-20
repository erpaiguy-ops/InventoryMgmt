import type { Employee, LeaveRequest, LeaveType, PayrollRun } from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';
import { ApprovalsService } from '../approvals/approvals.service';

import {
  CreateEmployeeDto,
  CreateLeaveRequestDto,
  CreatePayrollRunDto,
  PayPayrollRunDto,
  UpdateEmployeeDto,
} from './dto/hrm.dto';

type QueryError = { message: string } | null;

interface EmployeeRow {
  id: string;
  emp_no: string;
  full_name: string;
  profile_id: string | null;
  department: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  join_date: string | null;
  is_driver: boolean;
  basic_salary: number;
  allowances: number;
  deductions: number;
  cost_center_id: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
}
interface LeaveTypeRow {
  id: string;
  name: string;
  default_days: number;
  is_paid: boolean;
}
interface LeaveRequestRow {
  id: string;
  doc_no: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  days: number;
  reason_text: string | null;
  status: LeaveRequest['status'];
  created_at: string;
}
interface PayrollRunRow {
  id: string;
  doc_no: string;
  run_month: string;
  status: 'draft' | 'posted' | 'paid';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  notes: string | null;
  posted_at: string | null;
  paid_at: string | null;
  created_at: string;
}
interface PayslipRow {
  id: string;
  employee_id: string;
  basic: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  cost_center_id: string | null;
}

const toEmployee = (r: EmployeeRow): Employee => ({
  id: r.id,
  empNo: r.emp_no,
  fullName: r.full_name,
  profileId: r.profile_id,
  department: r.department,
  designation: r.designation,
  email: r.email,
  phone: r.phone,
  joinDate: r.join_date,
  isDriver: r.is_driver,
  basicSalary: Number(r.basic_salary),
  allowances: Number(r.allowances),
  deductions: Number(r.deductions),
  netSalary: Number(r.basic_salary) + Number(r.allowances) - Number(r.deductions),
  costCenterId: r.cost_center_id,
  status: r.status,
  notes: r.notes,
  createdAt: r.created_at,
});

@Injectable()
export class HrmService implements OnModuleInit {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  onModuleInit(): void {
    // Leave: final approval flips the status — no stock or GL involved.
    this.approvalsService.registerDocType(
      'leave_request',
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'leave_requests', docId, {
          status: 'approved',
        });
      },
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'leave_requests', docId, {
          status: 'rejected',
        });
      },
    );
  }

  // --- employees ---------------------------------------------------------------

  async listEmployees(tenantId: string): Promise<Employee[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'employees')
      .order('emp_no')) as unknown as { data: EmployeeRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toEmployee);
  }

  async createEmployee(tenantId: string, dto: CreateEmployeeDto): Promise<Employee> {
    const empNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'employee',
    });
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'employees', {
        emp_no: empNo,
        full_name: dto.fullName,
        department: dto.department,
        designation: dto.designation,
        email: dto.email,
        phone: dto.phone,
        join_date: dto.joinDate,
        is_driver: dto.isDriver ?? false,
        basic_salary: dto.basicSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        cost_center_id: dto.costCenterId,
        profile_id: dto.profileId,
        notes: dto.notes,
      })
      .select()
      .single()) as { data: EmployeeRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create employee');
    return toEmployee(data);
  }

  async updateEmployee(tenantId: string, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'employees', id, {
        full_name: dto.fullName,
        department: dto.department,
        designation: dto.designation,
        email: dto.email,
        phone: dto.phone,
        is_driver: dto.isDriver,
        basic_salary: dto.basicSalary,
        allowances: dto.allowances,
        deductions: dto.deductions,
        cost_center_id: dto.costCenterId,
        status: dto.status,
      })
      .select()
      .maybeSingle()) as { data: EmployeeRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Employee ${id} not found`);
    return toEmployee(data);
  }

  // --- leave -------------------------------------------------------------------

  async listLeaveTypes(tenantId: string): Promise<LeaveType[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'leave_types')
      .order('name')) as unknown as { data: LeaveTypeRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      defaultDays: r.default_days,
      isPaid: r.is_paid,
    }));
  }

  async listLeaveRequests(tenantId: string): Promise<LeaveRequest[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'leave_requests')
      .order('created_at', { ascending: false })
      .limit(200)) as unknown as { data: LeaveRequestRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const employees = await this.listEmployees(tenantId);
    const employeeMap = new Map(employees.map((e) => [e.id, e.fullName]));
    const leaveTypes = await this.listLeaveTypes(tenantId);
    const typeMap = new Map(leaveTypes.map((t) => [t.id, t.name]));

    return (data ?? []).map((r) => ({
      id: r.id,
      docNo: r.doc_no,
      employeeId: r.employee_id,
      employeeName: employeeMap.get(r.employee_id),
      leaveTypeId: r.leave_type_id,
      leaveTypeName: typeMap.get(r.leave_type_id),
      fromDate: r.from_date,
      toDate: r.to_date,
      days: Number(r.days),
      reasonText: r.reason_text,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  /** Creates the request already inside the approval chain — leave never self-approves. */
  async createLeaveRequest(
    tenantId: string,
    dto: CreateLeaveRequestDto,
    createdBy?: string,
  ): Promise<LeaveRequest[]> {
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'leave_request',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'leave_requests', {
        doc_no: docNo,
        employee_id: dto.employeeId,
        leave_type_id: dto.leaveTypeId,
        from_date: dto.fromDate,
        to_date: dto.toDate,
        days: dto.days,
        reason_text: dto.reasonText,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: LeaveRequestRow | null; error: QueryError };
    if (error || !doc) {
      throw new ConflictException(error?.message ?? 'Failed to create leave request');
    }

    await this.approvalsService.submit(tenantId, 'leave_request', doc.id, {
      reasonText: dto.reasonText ?? `Leave ${dto.fromDate} → ${dto.toDate}`,
      requestedBy: createdBy,
    });

    return this.listLeaveRequests(tenantId);
  }

  // --- payroll -----------------------------------------------------------------

  async listPayrollRuns(tenantId: string): Promise<PayrollRun[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'payroll_runs')
      .order('run_month', { ascending: false })) as unknown as {
      data: PayrollRunRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateRun(tenantId, row)));
  }

  private async hydrateRun(tenantId: string, row: PayrollRunRow): Promise<PayrollRun> {
    const { data: slips } = (await this.supabaseService
      .selectTenant(tenantId, 'payslips')
      .eq('run_id', row.id)) as unknown as { data: PayslipRow[] | null };
    const employees = await this.listEmployees(tenantId);
    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    return {
      id: row.id,
      docNo: row.doc_no,
      runMonth: row.run_month,
      status: row.status,
      totalGross: Number(row.total_gross),
      totalDeductions: Number(row.total_deductions),
      totalNet: Number(row.total_net),
      notes: row.notes,
      postedAt: row.posted_at,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      payslips: (slips ?? []).map((s) => ({
        id: s.id,
        employeeId: s.employee_id,
        employeeName: employeeMap.get(s.employee_id)?.fullName,
        empNo: employeeMap.get(s.employee_id)?.empNo,
        basic: Number(s.basic),
        allowances: Number(s.allowances),
        deductions: Number(s.deductions),
        netPay: Number(s.net_pay),
        costCenterId: s.cost_center_id,
      })),
    };
  }

  /**
   * Creates a draft run, snapshots every ACTIVE employee's salary into a
   * payslip, then posts the aggregate journal entry via the RPC. One run per
   * month — the DB unique constraint backstops that.
   */
  async createAndPostRun(
    tenantId: string,
    dto: CreatePayrollRunDto,
    createdBy?: string,
  ): Promise<PayrollRun> {
    const employees = (await this.listEmployees(tenantId)).filter((e) => e.status === 'active');
    if (employees.length === 0) {
      throw new BadRequestException('No active employees to run payroll for');
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'payroll_run',
    });

    const monthStart = `${dto.runMonth.slice(0, 7)}-01`;
    const { data: run, error } = (await this.supabaseService
      .insertTenant(tenantId, 'payroll_runs', {
        doc_no: docNo,
        run_month: monthStart,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: PayrollRunRow | null; error: QueryError };
    if (error || !run) {
      throw new ConflictException(
        error?.message?.includes('payroll_runs_tenant_id_run_month')
          ? `Payroll for ${dto.runMonth.slice(0, 7)} has already been run`
          : (error?.message ?? 'Failed to create payroll run'),
      );
    }

    const { error: slipError } = await this.supabaseService.insertTenant(
      tenantId,
      'payslips',
      employees.map((e) => ({
        run_id: run.id,
        employee_id: e.id,
        basic: e.basicSalary,
        allowances: e.allowances,
        deductions: e.deductions,
        net_pay: e.netSalary,
        cost_center_id: e.costCenterId,
      })),
    );
    if (slipError) {
      await this.supabaseService.deleteTenant(tenantId, 'payroll_runs', run.id);
      throw new BadRequestException(slipError.message);
    }

    try {
      await this.supabaseService.callTransaction('post_payroll_run', {
        p_tenant_id: tenantId,
        p_run_id: run.id,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'payroll_runs', run.id);
      throw e;
    }

    return this.hydrateRun(tenantId, {
      ...run,
      status: 'posted',
    });
  }

  async payRun(tenantId: string, runId: string, dto: PayPayrollRunDto): Promise<PayrollRun> {
    await this.supabaseService.callTransaction('pay_payroll_run', {
      p_tenant_id: tenantId,
      p_run_id: runId,
      p_source_account_id: dto.sourceAccountId,
    });
    const runs = await this.listPayrollRuns(tenantId);
    const run = runs.find((r) => r.id === runId);
    if (!run) throw new NotFoundException('Payroll run disappeared after payment');
    return run;
  }
}
