import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  CreateEmployeeDto,
  CreateLeaveRequestDto,
  CreatePayrollRunDto,
  PayPayrollRunDto,
  UpdateEmployeeDto,
} from './dto/hrm.dto';
import { HrmService } from './hrm.service';

@ApiTags('hrm')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('hrm')
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  // --- employees ---------------------------------------------------------------

  @Get('employees')
  @RequirePermission(MODULES.HRM, ACTIONS.VIEW)
  listEmployees(@CurrentTenant() tenantId: string) {
    return this.hrmService.listEmployees(tenantId);
  }

  @Post('employees')
  @RequirePermission(MODULES.HRM, ACTIONS.CREATE)
  createEmployee(@CurrentTenant() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.hrmService.createEmployee(tenantId, dto);
  }

  @Put('employees/:id')
  @RequirePermission(MODULES.HRM, ACTIONS.UPDATE)
  updateEmployee(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrmService.updateEmployee(tenantId, id, dto);
  }

  // --- leave -------------------------------------------------------------------

  @Get('leave-types')
  @RequirePermission(MODULES.HRM, ACTIONS.VIEW)
  listLeaveTypes(@CurrentTenant() tenantId: string) {
    return this.hrmService.listLeaveTypes(tenantId);
  }

  @Get('leave-requests')
  @RequirePermission(MODULES.HRM, ACTIONS.VIEW)
  listLeaveRequests(@CurrentTenant() tenantId: string) {
    return this.hrmService.listLeaveRequests(tenantId);
  }

  @Post('leave-requests')
  @RequirePermission(MODULES.HRM, ACTIONS.CREATE)
  createLeaveRequest(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLeaveRequestDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.hrmService.createLeaveRequest(tenantId, dto, principal.id);
  }

  // --- payroll -----------------------------------------------------------------

  @Get('payroll-runs')
  @RequirePermission(MODULES.HRM, ACTIONS.VIEW)
  listPayrollRuns(@CurrentTenant() tenantId: string) {
    return this.hrmService.listPayrollRuns(tenantId);
  }

  @Post('payroll-runs')
  @RequirePermission(MODULES.HRM, ACTIONS.MANAGE)
  createAndPostRun(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePayrollRunDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.hrmService.createAndPostRun(tenantId, dto, principal.id);
  }

  @Post('payroll-runs/:id/pay')
  @RequirePermission(MODULES.HRM, ACTIONS.MANAGE)
  payRun(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PayPayrollRunDto,
  ) {
    return this.hrmService.payRun(tenantId, id, dto);
  }
}
