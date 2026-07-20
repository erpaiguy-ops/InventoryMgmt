import type {
  Account,
  AgingRow,
  ApPayment,
  Account as AccountType,
  ArReceipt,
  BankAccount,
  BankTransaction,
  CostCenter,
  FiscalPeriod,
  JournalEntry,
  PaymentMethod,
  ReportRow,
} from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

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

type QueryError = { message: string } | null;

interface AccountRow {
  id: string;
  code: string;
  name: string;
  account_type: AccountType['accountType'];
  normal_balance: 'debit' | 'credit';
  parent_account_id: string | null;
  system_role: string | null;
  is_system: boolean;
  is_active: boolean;
}
interface CostCenterRow {
  id: string;
  code: string;
  name: string;
  center_type: CostCenter['centerType'];
  is_active: boolean;
}
interface JeRow {
  id: string;
  entry_no: string;
  entry_date: string;
  source_doc_type: string;
  source_doc_id: string | null;
  memo: string | null;
  created_at: string;
}
interface JeLineRow {
  id: string;
  account_id: string;
  cost_center_id: string | null;
  partner_id: string | null;
  debit: number;
  credit: number;
  description: string | null;
}
interface PaymentMethodRow {
  id: string;
  name: string;
  method_type: PaymentMethod['methodType'];
  bank_account_id: string | null;
  is_active: boolean;
}
interface BankAccountRow {
  id: string;
  name: string;
  account_number: string | null;
  account_id: string;
  opening_balance: number;
  is_active: boolean;
}
interface BankTxnRow {
  id: string;
  bank_account_id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  source: BankTransaction['source'];
  source_doc_type: string | null;
  source_doc_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  created_at: string;
}
interface ArReceiptRow {
  id: string;
  doc_no: string;
  customer_id: string;
  receipt_date: string;
  amount: number;
  payment_method_id: string | null;
  notes: string | null;
  created_at: string;
}
interface ApPaymentRow {
  id: string;
  doc_no: string;
  supplier_id: string;
  payment_date: string;
  amount: number;
  payment_method_id: string | null;
  notes: string | null;
  created_at: string;
}
interface OpenInvoiceRow {
  id: string;
  doc_no: string;
  customer_id: string;
  due_date: string | null;
  invoice_date: string;
  total: number;
  amount_paid: number;
}
interface OpenBillRow {
  id: string;
  doc_no: string;
  supplier_id: string;
  due_date: string | null;
  bill_date: string;
  total: number;
  amount_paid: number;
}
interface FiscalPeriodRow {
  id: string;
  period_start: string;
  period_end: string;
  status: 'open' | 'closed';
}

const toAccount = (r: AccountRow): Account => ({
  id: r.id,
  code: r.code,
  name: r.name,
  accountType: r.account_type,
  normalBalance: r.normal_balance,
  parentAccountId: r.parent_account_id,
  systemRole: r.system_role,
  isSystem: r.is_system,
  isActive: r.is_active,
});
const toCostCenter = (r: CostCenterRow): CostCenter => ({
  id: r.id,
  code: r.code,
  name: r.name,
  centerType: r.center_type,
  isActive: r.is_active,
});
const toPaymentMethod = (r: PaymentMethodRow): PaymentMethod => ({
  id: r.id,
  name: r.name,
  methodType: r.method_type,
  bankAccountId: r.bank_account_id,
  isActive: r.is_active,
});
const toBankAccount = (r: BankAccountRow): BankAccount => ({
  id: r.id,
  name: r.name,
  accountNumber: r.account_number,
  accountId: r.account_id,
  openingBalance: r.opening_balance,
  isActive: r.is_active,
});
const toBankTxn = (r: BankTxnRow): BankTransaction => ({
  id: r.id,
  bankAccountId: r.bank_account_id,
  txnDate: r.txn_date,
  description: r.description,
  amount: r.amount,
  source: r.source,
  sourceDocType: r.source_doc_type,
  sourceDocId: r.source_doc_id,
  isReconciled: r.is_reconciled,
  reconciledAt: r.reconciled_at,
  createdAt: r.created_at,
});
const toFiscalPeriod = (r: FiscalPeriodRow): FiscalPeriod => ({
  id: r.id,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  status: r.status,
});

function agingBucket(daysOverdue: number): AgingRow['bucket'] {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

@Injectable()
export class FinancialsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- chart of accounts -------------------------------------------------------

  async listAccounts(tenantId: string): Promise<Account[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'accounts')
      .order('code')) as unknown as { data: AccountRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toAccount);
  }

  async createAccount(tenantId: string, dto: CreateAccountDto): Promise<Account> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'accounts', {
        code: dto.code,
        name: dto.name,
        account_type: dto.accountType,
        normal_balance: dto.normalBalance,
        parent_account_id: dto.parentAccountId,
      })
      .select()
      .single()) as { data: AccountRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create account');
    return toAccount(data);
  }

  async updateAccount(tenantId: string, id: string, dto: UpdateAccountDto): Promise<Account> {
    const { data: existing } = (await this.supabaseService
      .selectTenant(tenantId, 'accounts', 'is_system')
      .eq('id', id)
      .maybeSingle()) as { data: { is_system: boolean } | null };
    if (existing?.is_system && dto.isActive === false) {
      throw new ConflictException('System accounts cannot be deactivated');
    }
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'accounts', id, { name: dto.name, is_active: dto.isActive })
      .select()
      .maybeSingle()) as { data: AccountRow | null; error: QueryError };
    if (error || !data) throw new NotFoundException(error?.message ?? `Account ${id} not found`);
    return toAccount(data);
  }

  // --- cost centers -------------------------------------------------------------

  async listCostCenters(tenantId: string): Promise<CostCenter[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'cost_centers')
      .order('code')) as unknown as { data: CostCenterRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toCostCenter);
  }

  async createCostCenter(tenantId: string, dto: CreateCostCenterDto): Promise<CostCenter> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'cost_centers', {
        code: dto.code,
        name: dto.name,
        center_type: dto.centerType ?? 'general',
      })
      .select()
      .single()) as { data: CostCenterRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create cost center');
    }
    return toCostCenter(data);
  }

  async updateCostCenter(
    tenantId: string,
    id: string,
    dto: UpdateCostCenterDto,
  ): Promise<CostCenter> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'cost_centers', id, { name: dto.name, is_active: dto.isActive })
      .select()
      .maybeSingle()) as { data: CostCenterRow | null; error: QueryError };
    if (error || !data) {
      throw new NotFoundException(error?.message ?? `Cost center ${id} not found`);
    }
    return toCostCenter(data);
  }

  // --- journal entries ----------------------------------------------------------

  async listJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'journal_entries')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)) as unknown as { data: JeRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateJe(tenantId, row)));
  }

  private async hydrateJe(tenantId: string, row: JeRow): Promise<JournalEntry> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'journal_entry_lines')
      .eq('entry_id', row.id)) as unknown as { data: JeLineRow[] | null };
    const accountIds = [...new Set((lines ?? []).map((l) => l.account_id))];
    const { data: accounts } = (await this.supabaseService
      .selectTenant(tenantId, 'accounts', 'id, code, name')
      .in('id', accountIds.length ? accountIds : [''])) as unknown as {
      data: { id: string; code: string; name: string }[] | null;
    };
    const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
    return {
      id: row.id,
      entryNo: row.entry_no,
      entryDate: row.entry_date,
      sourceDocType: row.source_doc_type,
      sourceDocId: row.source_doc_id,
      memo: row.memo,
      createdAt: row.created_at,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        accountId: l.account_id,
        accountCode: accountMap.get(l.account_id)?.code,
        accountName: accountMap.get(l.account_id)?.name,
        costCenterId: l.cost_center_id,
        partnerId: l.partner_id,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      })),
    };
  }

  /** Manual journal entry (misc adjustments) — same balanced-posting path every auto-posted document uses. */
  async createManualEntry(
    tenantId: string,
    dto: CreateJournalEntryDto,
    createdBy?: string,
  ): Promise<JournalEntry> {
    if (dto.lines.length < 2)
      throw new BadRequestException('A journal entry needs at least 2 lines');
    const totalDebit = dto.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException(
        `Entry does not balance: debits ${totalDebit} vs credits ${totalCredit}`,
      );
    }

    const entryId = await this.supabaseService.callTransaction<string>('post_journal_entry', {
      p_tenant_id: tenantId,
      p_entry_date: dto.entryDate ?? new Date().toISOString().slice(0, 10),
      p_source_doc_type: 'manual',
      p_source_doc_id: null,
      p_memo: dto.memo,
      p_lines: dto.lines.map((l) => ({
        account_id: l.accountId,
        cost_center_id: l.costCenterId,
        partner_id: l.partnerId,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        description: l.description,
      })),
      p_created_by: createdBy,
    });

    const entries = await this.listJournalEntries(tenantId);
    const created = entries.find((e) => e.id === entryId);
    if (!created) throw new NotFoundException('Journal entry disappeared after posting');
    return created;
  }

  // --- payment methods / bank accounts / bank transactions -----------------------

  async listPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'payment_methods')
      .order('name')) as unknown as { data: PaymentMethodRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toPaymentMethod);
  }

  async createPaymentMethod(tenantId: string, dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'payment_methods', {
        name: dto.name,
        method_type: dto.methodType,
        bank_account_id: dto.bankAccountId,
      })
      .select()
      .single()) as { data: PaymentMethodRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create payment method');
    }
    return toPaymentMethod(data);
  }

  async listBankAccounts(tenantId: string): Promise<BankAccount[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'bank_accounts')
      .order('name')) as unknown as { data: BankAccountRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toBankAccount);
  }

  async createBankAccount(tenantId: string, dto: CreateBankAccountDto): Promise<BankAccount> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'bank_accounts', {
        name: dto.name,
        account_number: dto.accountNumber,
        account_id: dto.accountId,
        opening_balance: dto.openingBalance ?? 0,
      })
      .select()
      .single()) as { data: BankAccountRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create bank account');
    }
    return toBankAccount(data);
  }

  async listBankTransactions(tenantId: string, bankAccountId?: string): Promise<BankTransaction[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'bank_transactions');
    if (bankAccountId) builder = builder.eq('bank_account_id', bankAccountId);
    const { data, error } = (await builder
      .order('txn_date', { ascending: false })
      .limit(200)) as unknown as { data: BankTxnRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toBankTxn);
  }

  async createBankTransaction(
    tenantId: string,
    dto: CreateBankTransactionDto,
    createdBy?: string,
  ): Promise<BankTransaction> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'bank_transactions', {
        bank_account_id: dto.bankAccountId,
        txn_date: dto.txnDate,
        description: dto.description,
        amount: dto.amount,
        source: 'manual',
        created_by: createdBy,
      })
      .select()
      .single()) as { data: BankTxnRow | null; error: QueryError };
    if (error || !data) {
      throw new ConflictException(error?.message ?? 'Failed to create bank transaction');
    }
    return toBankTxn(data);
  }

  async reconcileBankTransaction(tenantId: string, id: string): Promise<BankTransaction> {
    const { data, error } = (await this.supabaseService
      .updateTenant(tenantId, 'bank_transactions', id, {
        is_reconciled: true,
        reconciled_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()) as { data: BankTxnRow | null; error: QueryError };
    if (error || !data) {
      throw new NotFoundException(error?.message ?? `Bank transaction ${id} not found`);
    }
    return toBankTxn(data);
  }

  // --- AR receipts ----------------------------------------------------------------

  async listArReceipts(tenantId: string): Promise<ArReceipt[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'ar_receipts')
      .order('created_at', { ascending: false })
      .limit(200)) as unknown as { data: ArReceiptRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const customers = await this.partnerNames(
      tenantId,
      (data ?? []).map((r) => r.customer_id),
    );
    const result: ArReceipt[] = [];
    for (const row of data ?? []) {
      const { data: allocs } = (await this.supabaseService
        .selectTenant(tenantId, 'ar_receipt_allocations')
        .eq('receipt_id', row.id)) as unknown as {
        data: { id: string; invoice_id: string; amount: number }[] | null;
      };
      result.push({
        id: row.id,
        docNo: row.doc_no,
        customerId: row.customer_id,
        customerName: customers.get(row.customer_id),
        receiptDate: row.receipt_date,
        amount: row.amount,
        paymentMethodId: row.payment_method_id,
        notes: row.notes,
        createdAt: row.created_at,
        allocations: (allocs ?? []).map((a) => ({
          id: a.id,
          invoiceId: a.invoice_id,
          amount: a.amount,
        })),
      });
    }
    return result;
  }

  private async partnerNames(tenantId: string, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'partners', 'id, name')
      .in('id', [...new Set(ids)])) as unknown as { data: { id: string; name: string }[] | null };
    return new Map((data ?? []).map((p) => [p.id, p.name]));
  }

  /** Creates the receipt + allocations, then posts Dr Bank-or-Cash / Cr AR via the DB RPC — rolling back the receipt if posting fails (e.g. over-allocation). */
  async createArReceipt(
    tenantId: string,
    dto: CreateArReceiptDto,
    createdBy?: string,
  ): Promise<ArReceipt> {
    if (dto.allocations.length === 0) {
      throw new BadRequestException('A receipt needs at least one allocation');
    }
    const allocatedTotal = dto.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(allocatedTotal - dto.amount) > 0.0001) {
      throw new BadRequestException(
        `Allocated total ${allocatedTotal} must equal the receipt amount ${dto.amount}`,
      );
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'ar_receipt',
    });

    const { data: receipt, error } = (await this.supabaseService
      .insertTenant(tenantId, 'ar_receipts', {
        doc_no: docNo,
        customer_id: dto.customerId,
        receipt_date: dto.receiptDate,
        amount: dto.amount,
        payment_method_id: dto.paymentMethodId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: ArReceiptRow | null; error: QueryError };
    if (error || !receipt)
      throw new ConflictException(error?.message ?? 'Failed to create receipt');

    const { error: allocError } = await this.supabaseService.insertTenant(
      tenantId,
      'ar_receipt_allocations',
      dto.allocations.map((a) => ({
        receipt_id: receipt.id,
        invoice_id: a.invoiceId,
        amount: a.amount,
      })),
    );
    if (allocError) {
      await this.supabaseService.deleteTenant(tenantId, 'ar_receipts', receipt.id);
      throw new BadRequestException(allocError.message);
    }

    try {
      await this.supabaseService.callTransaction('post_ar_receipt', {
        p_tenant_id: tenantId,
        p_receipt_id: receipt.id,
        p_deposit_account_id: dto.depositAccountId,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'ar_receipts', receipt.id);
      throw e;
    }

    const receipts = await this.listArReceipts(tenantId);
    const created = receipts.find((r) => r.id === receipt.id);
    if (!created) throw new NotFoundException('Receipt disappeared after posting');
    return created;
  }

  // --- AP payments ------------------------------------------------------------------

  async listApPayments(tenantId: string): Promise<ApPayment[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'ap_payments')
      .order('created_at', { ascending: false })
      .limit(200)) as unknown as { data: ApPaymentRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const suppliers = await this.partnerNames(
      tenantId,
      (data ?? []).map((p) => p.supplier_id),
    );
    const result: ApPayment[] = [];
    for (const row of data ?? []) {
      const { data: allocs } = (await this.supabaseService
        .selectTenant(tenantId, 'ap_payment_allocations')
        .eq('payment_id', row.id)) as unknown as {
        data: { id: string; bill_id: string; amount: number }[] | null;
      };
      result.push({
        id: row.id,
        docNo: row.doc_no,
        supplierId: row.supplier_id,
        supplierName: suppliers.get(row.supplier_id),
        paymentDate: row.payment_date,
        amount: row.amount,
        paymentMethodId: row.payment_method_id,
        notes: row.notes,
        createdAt: row.created_at,
        allocations: (allocs ?? []).map((a) => ({
          id: a.id,
          billId: a.bill_id,
          amount: a.amount,
        })),
      });
    }
    return result;
  }

  async createApPayment(
    tenantId: string,
    dto: CreateApPaymentDto,
    createdBy?: string,
  ): Promise<ApPayment> {
    if (dto.allocations.length === 0) {
      throw new BadRequestException('A payment needs at least one allocation');
    }
    const allocatedTotal = dto.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(allocatedTotal - dto.amount) > 0.0001) {
      throw new BadRequestException(
        `Allocated total ${allocatedTotal} must equal the payment amount ${dto.amount}`,
      );
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'ap_payment',
    });

    const { data: payment, error } = (await this.supabaseService
      .insertTenant(tenantId, 'ap_payments', {
        doc_no: docNo,
        supplier_id: dto.supplierId,
        payment_date: dto.paymentDate,
        amount: dto.amount,
        payment_method_id: dto.paymentMethodId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: ApPaymentRow | null; error: QueryError };
    if (error || !payment)
      throw new ConflictException(error?.message ?? 'Failed to create payment');

    const { error: allocError } = await this.supabaseService.insertTenant(
      tenantId,
      'ap_payment_allocations',
      dto.allocations.map((a) => ({
        payment_id: payment.id,
        bill_id: a.billId,
        amount: a.amount,
      })),
    );
    if (allocError) {
      await this.supabaseService.deleteTenant(tenantId, 'ap_payments', payment.id);
      throw new BadRequestException(allocError.message);
    }

    try {
      await this.supabaseService.callTransaction('post_ap_payment', {
        p_tenant_id: tenantId,
        p_payment_id: payment.id,
        p_source_account_id: dto.sourceAccountId,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'ap_payments', payment.id);
      throw e;
    }

    const payments = await this.listApPayments(tenantId);
    const created = payments.find((p) => p.id === payment.id);
    if (!created) throw new NotFoundException('Payment disappeared after posting');
    return created;
  }

  // --- aging ---------------------------------------------------------------------

  async arAging(tenantId: string): Promise<AgingRow[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(
        tenantId,
        'sales_invoices',
        'id, doc_no, customer_id, due_date, invoice_date, total, amount_paid',
      )
      .eq('status', 'open')) as unknown as { data: OpenInvoiceRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    const customers = await this.partnerNames(
      tenantId,
      (data ?? []).map((r) => r.customer_id),
    );
    const today = new Date();
    return (data ?? []).map((row) => {
      const reference = new Date(row.due_date ?? row.invoice_date);
      const daysOverdue = Math.floor((today.getTime() - reference.getTime()) / 86_400_000);
      return {
        docId: row.id,
        docNo: row.doc_no,
        partnerId: row.customer_id,
        partnerName: customers.get(row.customer_id),
        dueDate: row.due_date,
        total: row.total,
        amountPaid: row.amount_paid,
        balance: row.total - row.amount_paid,
        daysOverdue,
        bucket: agingBucket(daysOverdue),
      };
    });
  }

  async apAging(tenantId: string): Promise<AgingRow[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(
        tenantId,
        'purchase_bills',
        'id, doc_no, supplier_id, due_date, bill_date, total, amount_paid',
      )
      .eq('status', 'open')) as unknown as { data: OpenBillRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    const suppliers = await this.partnerNames(
      tenantId,
      (data ?? []).map((r) => r.supplier_id),
    );
    const today = new Date();
    return (data ?? []).map((row) => {
      const reference = new Date(row.due_date ?? row.bill_date);
      const daysOverdue = Math.floor((today.getTime() - reference.getTime()) / 86_400_000);
      return {
        docId: row.id,
        docNo: row.doc_no,
        partnerId: row.supplier_id,
        partnerName: suppliers.get(row.supplier_id),
        dueDate: row.due_date,
        total: row.total,
        amountPaid: row.amount_paid,
        balance: row.total - row.amount_paid,
        daysOverdue,
        bucket: agingBucket(daysOverdue),
      };
    });
  }

  // --- fiscal periods --------------------------------------------------------------

  async listFiscalPeriods(tenantId: string): Promise<FiscalPeriod[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'fiscal_periods')
      .order('period_start', { ascending: false })) as unknown as {
      data: FiscalPeriodRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toFiscalPeriod);
  }

  async closePeriod(tenantId: string, dto: ClosePeriodDto): Promise<void> {
    await this.supabaseService.callTransaction('close_fiscal_period', {
      p_tenant_id: tenantId,
      p_period_start: dto.periodStart,
    });
  }

  // --- reports -----------------------------------------------------------------------

  async balanceSheet(tenantId: string, asOf: string): Promise<ReportRow[]> {
    const rows = await this.supabaseService.callTransaction<
      {
        account_id: string;
        code: string;
        name: string;
        account_type: AccountType['accountType'];
        normal_balance: 'debit' | 'credit';
        balance: number;
      }[]
    >('report_balance_sheet', { p_tenant_id: tenantId, p_as_of: asOf });
    return (rows ?? []).map((r) => ({
      accountId: r.account_id,
      code: r.code,
      name: r.name,
      accountType: r.account_type,
      normalBalance: r.normal_balance,
      balance: r.balance,
    }));
  }

  async profitAndLoss(
    tenantId: string,
    from: string,
    to: string,
    costCenterId?: string,
  ): Promise<ReportRow[]> {
    const rows = await this.supabaseService.callTransaction<
      {
        account_id: string;
        code: string;
        name: string;
        account_type: AccountType['accountType'];
        normal_balance: 'debit' | 'credit';
        balance: number;
      }[]
    >('report_profit_and_loss', {
      p_tenant_id: tenantId,
      p_from: from,
      p_to: to,
      p_cost_center_id: costCenterId,
    });
    return (rows ?? []).map((r) => ({
      accountId: r.account_id,
      code: r.code,
      name: r.name,
      accountType: r.account_type,
      normalBalance: r.normal_balance,
      balance: r.balance,
    }));
  }
}
