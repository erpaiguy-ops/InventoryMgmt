import { ACTIONS, MODULES, type Principal } from '@inventory-mgmt/shared-types';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  ClosePeriodDto,
  CreateAccountDto,
  CreateApPaymentDto,
  CreateArReceiptDto,
  CreateBankAccountDto,
  CreateBankTransactionDto,
  CreateCostCenterDto,
  CreateJournalEntryDto,
  CreatePaymentMethodDto,
  UpdateAccountDto,
  UpdateCostCenterDto,
} from './dto/financials.dto';
import { FinancialsService } from './financials.service';

@ApiTags('financials')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('financials')
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  // --- chart of accounts -------------------------------------------------------

  @Get('accounts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listAccounts(@CurrentTenant() tenantId: string) {
    return this.financialsService.listAccounts(tenantId);
  }

  @Post('accounts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createAccount(@CurrentTenant() tenantId: string, @Body() dto: CreateAccountDto) {
    return this.financialsService.createAccount(tenantId, dto);
  }

  @Put('accounts/:id')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.UPDATE)
  updateAccount(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.financialsService.updateAccount(tenantId, id, dto);
  }

  // --- cost centers -------------------------------------------------------------

  @Get('cost-centers')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listCostCenters(@CurrentTenant() tenantId: string) {
    return this.financialsService.listCostCenters(tenantId);
  }

  @Post('cost-centers')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createCostCenter(@CurrentTenant() tenantId: string, @Body() dto: CreateCostCenterDto) {
    return this.financialsService.createCostCenter(tenantId, dto);
  }

  @Put('cost-centers/:id')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.UPDATE)
  updateCostCenter(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    return this.financialsService.updateCostCenter(tenantId, id, dto);
  }

  // --- journal entries ----------------------------------------------------------

  @Get('journal-entries')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listJournalEntries(@CurrentTenant() tenantId: string) {
    return this.financialsService.listJournalEntries(tenantId);
  }

  @Post('journal-entries')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.MANAGE)
  createManualEntry(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateJournalEntryDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.financialsService.createManualEntry(tenantId, dto, principal.id);
  }

  // --- payment methods / bank accounts / bank transactions -----------------------

  @Get('payment-methods')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listPaymentMethods(@CurrentTenant() tenantId: string) {
    return this.financialsService.listPaymentMethods(tenantId);
  }

  @Post('payment-methods')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createPaymentMethod(@CurrentTenant() tenantId: string, @Body() dto: CreatePaymentMethodDto) {
    return this.financialsService.createPaymentMethod(tenantId, dto);
  }

  @Get('bank-accounts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listBankAccounts(@CurrentTenant() tenantId: string) {
    return this.financialsService.listBankAccounts(tenantId);
  }

  @Post('bank-accounts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createBankAccount(@CurrentTenant() tenantId: string, @Body() dto: CreateBankAccountDto) {
    return this.financialsService.createBankAccount(tenantId, dto);
  }

  @Get('bank-transactions')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listBankTransactions(
    @CurrentTenant() tenantId: string,
    @Query('bankAccountId') bankAccountId?: string,
  ) {
    return this.financialsService.listBankTransactions(tenantId, bankAccountId);
  }

  @Post('bank-transactions')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createBankTransaction(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBankTransactionDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.financialsService.createBankTransaction(tenantId, dto, principal.id);
  }

  @Post('bank-transactions/:id/reconcile')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.UPDATE)
  reconcileBankTransaction(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.financialsService.reconcileBankTransaction(tenantId, id);
  }

  // --- AR receipts ----------------------------------------------------------------

  @Get('ar-receipts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listArReceipts(@CurrentTenant() tenantId: string) {
    return this.financialsService.listArReceipts(tenantId);
  }

  @Post('ar-receipts')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createArReceipt(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateArReceiptDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.financialsService.createArReceipt(tenantId, dto, principal.id);
  }

  // --- AP payments ------------------------------------------------------------------

  @Get('ap-payments')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listApPayments(@CurrentTenant() tenantId: string) {
    return this.financialsService.listApPayments(tenantId);
  }

  @Post('ap-payments')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.CREATE)
  createApPayment(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateApPaymentDto,
    @CurrentPrincipal() principal: Principal,
  ) {
    return this.financialsService.createApPayment(tenantId, dto, principal.id);
  }

  // --- aging ---------------------------------------------------------------------

  @Get('reports/ar-aging')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  arAging(@CurrentTenant() tenantId: string) {
    return this.financialsService.arAging(tenantId);
  }

  @Get('reports/ap-aging')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  apAging(@CurrentTenant() tenantId: string) {
    return this.financialsService.apAging(tenantId);
  }

  // --- fiscal periods --------------------------------------------------------------

  @Get('fiscal-periods')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  listFiscalPeriods(@CurrentTenant() tenantId: string) {
    return this.financialsService.listFiscalPeriods(tenantId);
  }

  @Post('fiscal-periods/close')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.MANAGE)
  closePeriod(@CurrentTenant() tenantId: string, @Body() dto: ClosePeriodDto) {
    return this.financialsService.closePeriod(tenantId, dto);
  }

  // --- statements -----------------------------------------------------------------

  @Get('reports/balance-sheet')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  balanceSheet(@CurrentTenant() tenantId: string, @Query('asOf') asOf: string) {
    return this.financialsService.balanceSheet(tenantId, asOf);
  }

  @Get('reports/profit-and-loss')
  @RequirePermission(MODULES.FINANCIALS, ACTIONS.VIEW)
  profitAndLoss(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    return this.financialsService.profitAndLoss(tenantId, from, to, costCenterId);
  }
}
