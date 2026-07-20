import type { Vehicle, VehicleDocument, VehicleExpense } from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import {
  CreateVehicleDocumentDto,
  CreateVehicleDto,
  CreateVehicleExpenseDto,
  UpdateVehicleDto,
} from './dto/fleet.dto';

type QueryError = { message: string } | null;

interface VehicleRow {
  id: string;
  doc_no: string;
  reg_no: string;
  name: string;
  ownership: 'owned' | 'rented';
  asset_id: string | null;
  driver_employee_id: string | null;
  cost_center_id: string | null;
  capacity: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
}
interface DocumentRow {
  id: string;
  vehicle_id: string;
  doc_type: VehicleDocument['docType'];
  doc_ref: string | null;
  expiry_date: string | null;
  notes: string | null;
}
interface ExpenseRow {
  id: string;
  doc_no: string;
  vehicle_id: string;
  expense_type: VehicleExpense['expenseType'];
  expense_date: string;
  amount: number;
  odometer: number | null;
  quantity: number | null;
  description: string | null;
  status: 'draft' | 'posted';
  posted_at: string | null;
  created_at: string;
}

@Injectable()
export class FleetService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- vehicles ---------------------------------------------------------------

  async listVehicles(tenantId: string): Promise<Vehicle[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'vehicles')
      .order('reg_no')) as unknown as { data: VehicleRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return this.hydrateVehicles(tenantId, data ?? []);
  }

  private async hydrateVehicles(tenantId: string, rows: VehicleRow[]): Promise<Vehicle[]> {
    const driverIds = [
      ...new Set(rows.map((r) => r.driver_employee_id).filter(Boolean)),
    ] as string[];
    const { data: drivers } = (await this.supabaseService
      .selectTenant(tenantId, 'employees', 'id, full_name')
      .in('id', driverIds.length ? driverIds : [''])) as unknown as {
      data: { id: string; full_name: string }[] | null;
    };
    const driverMap = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));

    const ccIds = [...new Set(rows.map((r) => r.cost_center_id).filter(Boolean))] as string[];
    const { data: centers } = (await this.supabaseService
      .selectTenant(tenantId, 'cost_centers', 'id, code')
      .in('id', ccIds.length ? ccIds : [''])) as unknown as {
      data: { id: string; code: string }[] | null;
    };
    const ccMap = new Map((centers ?? []).map((c) => [c.id, c.code]));

    return rows.map((row) => ({
      id: row.id,
      docNo: row.doc_no,
      regNo: row.reg_no,
      name: row.name,
      ownership: row.ownership,
      assetId: row.asset_id,
      driverEmployeeId: row.driver_employee_id,
      driverName: row.driver_employee_id ? driverMap.get(row.driver_employee_id) : undefined,
      costCenterId: row.cost_center_id,
      costCenterCode: row.cost_center_id ? ccMap.get(row.cost_center_id) : undefined,
      capacity: row.capacity,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  /** Every vehicle gets its own cost center so its true cost is a P&L filter. */
  async createVehicle(tenantId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'vehicle',
    });

    const { data: costCenter, error: ccError } = (await this.supabaseService
      .insertTenant(tenantId, 'cost_centers', {
        code: `VEH-${dto.regNo.toUpperCase()}`,
        name: `Vehicle ${dto.regNo.toUpperCase()}`,
        center_type: 'vehicle',
      })
      .select()
      .single()) as { data: { id: string } | null; error: QueryError };
    if (ccError || !costCenter) {
      throw new ConflictException(ccError?.message ?? 'Failed to create vehicle cost center');
    }

    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'vehicles', {
        doc_no: docNo,
        reg_no: dto.regNo.toUpperCase(),
        name: dto.name,
        ownership: dto.ownership,
        asset_id: dto.assetId,
        driver_employee_id: dto.driverEmployeeId,
        cost_center_id: costCenter.id,
        capacity: dto.capacity,
        notes: dto.notes,
      })
      .select()
      .single()) as { data: VehicleRow | null; error: QueryError };
    if (error || !data) {
      await this.supabaseService.deleteTenant(tenantId, 'cost_centers', costCenter.id);
      throw new ConflictException(error?.message ?? 'Failed to create vehicle');
    }
    const [vehicle] = await this.hydrateVehicles(tenantId, [data]);
    return vehicle as Vehicle;
  }

  async updateVehicle(tenantId: string, id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'vehicles', id, {
        name: dto.name,
        driver_employee_id: dto.driverEmployeeId,
        capacity: dto.capacity,
        status: dto.status,
        notes: dto.notes,
      })
      .select()
      .maybeSingle()) as { data: VehicleRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Vehicle ${id} not found`);
    const [vehicle] = await this.hydrateVehicles(tenantId, [data]);
    return vehicle as Vehicle;
  }

  // --- documents (with expiry radar) ------------------------------------------

  async listDocuments(tenantId: string, vehicleId?: string): Promise<VehicleDocument[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'vehicle_documents');
    if (vehicleId) builder = builder.eq('vehicle_id', vehicleId);
    const { data, error } = (await builder.order('expiry_date', {
      ascending: true,
      nullsFirst: false,
    })) as unknown as { data: DocumentRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const vehicles = await this.listVehicles(tenantId);
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v.regNo]));
    const today = Date.now();

    return (data ?? []).map((row) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      vehicleRegNo: vehicleMap.get(row.vehicle_id),
      docType: row.doc_type,
      docRef: row.doc_ref,
      expiryDate: row.expiry_date,
      daysToExpiry: row.expiry_date
        ? Math.ceil((new Date(row.expiry_date).getTime() - today) / 86_400_000)
        : null,
      notes: row.notes,
    }));
  }

  async createDocument(
    tenantId: string,
    dto: CreateVehicleDocumentDto,
  ): Promise<VehicleDocument[]> {
    const { error } = await this.supabaseService.insertTenant(tenantId, 'vehicle_documents', {
      vehicle_id: dto.vehicleId,
      doc_type: dto.docType,
      doc_ref: dto.docRef,
      expiry_date: dto.expiryDate,
      notes: dto.notes,
    });
    if (error) throw new ConflictException(error.message);
    return this.listDocuments(tenantId);
  }

  // --- expenses ----------------------------------------------------------------

  async listExpenses(tenantId: string, vehicleId?: string): Promise<VehicleExpense[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'vehicle_expenses');
    if (vehicleId) builder = builder.eq('vehicle_id', vehicleId);
    const { data, error } = (await builder
      .order('expense_date', { ascending: false })
      .limit(200)) as unknown as { data: ExpenseRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const vehicles = await this.listVehicles(tenantId);
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v.regNo]));

    return (data ?? []).map((row) => ({
      id: row.id,
      docNo: row.doc_no,
      vehicleId: row.vehicle_id,
      vehicleRegNo: vehicleMap.get(row.vehicle_id),
      expenseType: row.expense_type,
      expenseDate: row.expense_date,
      amount: Number(row.amount),
      odometer: row.odometer,
      quantity: row.quantity,
      description: row.description,
      status: row.status,
      postedAt: row.posted_at,
      createdAt: row.created_at,
    }));
  }

  /** Creates AND posts — Dr Vehicle Expense on the vehicle's cost center, Cr the chosen account. */
  async createExpense(
    tenantId: string,
    dto: CreateVehicleExpenseDto,
    createdBy?: string,
  ): Promise<VehicleExpense[]> {
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'vehicle_expense',
    });

    const { data: expense, error } = (await this.supabaseService
      .insertTenant(tenantId, 'vehicle_expenses', {
        doc_no: docNo,
        vehicle_id: dto.vehicleId,
        expense_type: dto.expenseType,
        expense_date: dto.expenseDate,
        amount: dto.amount,
        odometer: dto.odometer,
        quantity: dto.quantity,
        description: dto.description,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: ExpenseRow | null; error: QueryError };
    if (error || !expense)
      throw new ConflictException(error?.message ?? 'Failed to create expense');

    try {
      await this.supabaseService.callTransaction('post_vehicle_expense', {
        p_tenant_id: tenantId,
        p_expense_id: expense.id,
        p_credit_account_id: dto.creditAccountId,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'vehicle_expenses', expense.id);
      throw e;
    }

    return this.listExpenses(tenantId);
  }
}
