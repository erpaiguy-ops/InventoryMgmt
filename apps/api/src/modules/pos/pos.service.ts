import type { CashDrawerSession, PosSale } from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import {
  CloseCashDrawerSessionDto,
  CreatePosSaleDto,
  OpenCashDrawerSessionDto,
} from './dto/pos.dto';

type QueryError = { message: string } | null;

interface SessionRow {
  id: string;
  opening_float: number;
  status: 'open' | 'closed';
  closing_counted: number | null;
  closing_expected: number | null;
  over_short: number | null;
  opened_at: string;
  closed_at: string | null;
}
interface SaleRow {
  id: string;
  doc_no: string;
  session_id: string;
  customer_id: string | null;
  warehouse_id: string;
  payment_method_id: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status: 'draft' | 'posted';
  posted_at: string | null;
  created_at: string;
}
interface SaleLineRow {
  id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  tax_id: string | null;
  line_total: number;
}

const toSession = (r: SessionRow): CashDrawerSession => ({
  id: r.id,
  openingFloat: Number(r.opening_float),
  status: r.status,
  closingCounted: r.closing_counted === null ? null : Number(r.closing_counted),
  closingExpected: r.closing_expected === null ? null : Number(r.closing_expected),
  overShort: r.over_short === null ? null : Number(r.over_short),
  openedAt: r.opened_at,
  closedAt: r.closed_at,
});

@Injectable()
export class PosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- cash drawer sessions ----------------------------------------------------

  async listSessions(tenantId: string): Promise<CashDrawerSession[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'cash_drawer_sessions')
      .order('opened_at', { ascending: false })
      .limit(100)) as unknown as { data: SessionRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toSession);
  }

  async openSession(
    tenantId: string,
    dto: OpenCashDrawerSessionDto,
    createdBy?: string,
  ): Promise<CashDrawerSession> {
    const session = await this.supabaseService.callTransaction<SessionRow>(
      'open_cash_drawer_session',
      {
        p_tenant_id: tenantId,
        p_opening_float: dto.openingFloat,
        p_created_by: createdBy,
      },
    );
    return toSession(session);
  }

  async closeSession(
    tenantId: string,
    id: string,
    dto: CloseCashDrawerSessionDto,
    closedBy?: string,
  ): Promise<CashDrawerSession> {
    const session = await this.supabaseService.callTransaction<SessionRow>(
      'close_cash_drawer_session',
      {
        p_tenant_id: tenantId,
        p_session_id: id,
        p_counted_amount: dto.countedAmount,
        p_closed_by: closedBy,
      },
    );
    return toSession(session);
  }

  // --- pos sales ----------------------------------------------------------------

  async listSales(tenantId: string, sessionId?: string): Promise<PosSale[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'pos_sales');
    if (sessionId) builder = builder.eq('session_id', sessionId);
    const { data, error } = (await builder
      .order('created_at', { ascending: false })
      .limit(200)) as unknown as { data: SaleRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateSale(tenantId, row)));
  }

  private async hydrateSale(tenantId: string, row: SaleRow): Promise<PosSale> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'pos_sale_lines')
      .eq('sale_id', row.id)) as unknown as { data: SaleLineRow[] | null };

    const itemIds = [...new Set((lines ?? []).map((l) => l.item_id))];
    const { data: items } = (await this.supabaseService
      .selectTenant(tenantId, 'items', 'id, sku, name')
      .in('id', itemIds.length ? itemIds : [''])) as unknown as {
      data: { id: string; sku: string; name: string }[] | null;
    };
    const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

    const { data: paymentMethod } = (await this.supabaseService
      .selectTenant(tenantId, 'payment_methods', 'name')
      .eq('id', row.payment_method_id)
      .maybeSingle()) as { data: { name: string } | null };

    let customerName: string | undefined;
    if (row.customer_id) {
      const { data: customer } = (await this.supabaseService
        .selectTenant(tenantId, 'partners', 'name')
        .eq('id', row.customer_id)
        .maybeSingle()) as { data: { name: string } | null };
      customerName = customer?.name;
    }

    return {
      id: row.id,
      docNo: row.doc_no,
      sessionId: row.session_id,
      customerId: row.customer_id,
      customerName,
      warehouseId: row.warehouse_id,
      paymentMethodId: row.payment_method_id,
      paymentMethodName: paymentMethod?.name,
      subtotal: Number(row.subtotal),
      taxTotal: Number(row.tax_total),
      total: Number(row.total),
      status: row.status,
      postedAt: row.posted_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemSku: itemMap.get(line.item_id)?.sku,
        itemName: itemMap.get(line.item_id)?.name,
        qty: Number(line.qty),
        unitPrice: Number(line.unit_price),
        taxId: line.tax_id,
        lineTotal: Number(line.line_total),
      })),
    };
  }

  /** Creates and posts in one step: a POS sale is paid in full at the register, not invoiced on credit. */
  async createSale(tenantId: string, dto: CreatePosSaleDto, createdBy?: string): Promise<PosSale> {
    if (dto.lines.length === 0) throw new BadRequestException('A sale needs at least one line');

    const { data: taxes } = (await this.supabaseService.selectTenant(
      tenantId,
      'taxes',
      'id, rate',
    )) as unknown as { data: { id: string; rate: number }[] | null };
    const taxRate = new Map((taxes ?? []).map((t) => [t.id, Number(t.rate)]));

    let subtotal = 0;
    let taxTotal = 0;
    for (const line of dto.lines) {
      const lineTotal = line.qty * line.unitPrice;
      subtotal += lineTotal;
      if (line.taxId) taxTotal += lineTotal * ((taxRate.get(line.taxId) ?? 0) / 100);
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'pos_sale',
    });

    const { data: sale, error } = (await this.supabaseService
      .insertTenant(tenantId, 'pos_sales', {
        doc_no: docNo,
        session_id: dto.sessionId,
        customer_id: dto.customerId,
        warehouse_id: dto.warehouseId,
        payment_method_id: dto.paymentMethodId,
        subtotal,
        tax_total: taxTotal,
        total: subtotal + taxTotal,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: SaleRow | null; error: QueryError };
    if (error || !sale) throw new ConflictException(error?.message ?? 'Failed to create sale');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'pos_sale_lines',
      dto.lines.map((line) => ({
        sale_id: sale.id,
        item_id: line.itemId,
        qty: line.qty,
        unit_price: line.unitPrice,
        tax_id: line.taxId,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'pos_sales', sale.id);
      throw new BadRequestException(lineError.message);
    }

    try {
      await this.supabaseService.callTransaction('post_pos_sale', {
        p_tenant_id: tenantId,
        p_doc_id: sale.id,
        p_deposit_account_id: dto.depositAccountId,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'pos_sales', sale.id);
      throw e;
    }

    return this.hydrateSale(tenantId, { ...sale, status: 'posted' });
  }
}
