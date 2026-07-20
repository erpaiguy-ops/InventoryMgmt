import type {
  DeliveryNote,
  SalesInvoice,
  SalesOrderDoc,
  SalesReturnDoc,
} from '@inventory-mgmt/shared-types';
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
  CreateDeliveryDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
} from './dto/sales.dto';

type QueryError = { message: string } | null;

interface SoRow {
  id: string;
  doc_no: string;
  customer_id: string;
  warehouse_id: string;
  order_date: string;
  expected_date: string | null;
  status: SalesOrderDoc['status'];
  subtotal: number;
  tax_total: number;
  total: number;
  notes: string | null;
  created_at: string;
}
interface SoLineRow {
  id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  tax_id: string | null;
  line_total: number;
  qty_delivered: number;
  qty_invoiced: number;
}
interface DeliveryRow {
  id: string;
  doc_no: string;
  so_id: string;
  warehouse_id: string;
  status: 'draft' | 'posted';
  notes: string | null;
  posted_at: string | null;
  created_at: string;
}
interface DeliveryLineRow {
  id: string;
  so_line_id: string;
  item_id: string;
  batch_id: string | null;
  qty: number;
}
interface InvoiceRow {
  id: string;
  doc_no: string;
  so_id: string;
  customer_id: string;
  invoice_date: string;
  due_date: string | null;
  status: 'open' | 'paid' | 'cancelled';
  subtotal: number;
  tax_total: number;
  total: number;
  notes: string | null;
  created_at: string;
}
interface InvoiceLineRow {
  id: string;
  so_line_id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
}
interface ReturnRow {
  id: string;
  doc_no: string;
  customer_id: string;
  warehouse_id: string;
  reason_code_id: string | null;
  reason_text: string | null;
  status: SalesReturnDoc['status'];
  posted_at: string | null;
  created_at: string;
}
interface ReturnLineRow {
  id: string;
  item_id: string;
  batch_id: string | null;
  qty: number;
}
interface ItemRef {
  id: string;
  sku: string;
  name: string;
}

@Injectable()
export class SalesService implements OnModuleInit {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  onModuleInit(): void {
    // SO: final approval confirms; rejection marks rejected.
    this.approvalsService.registerDocType(
      'sales_order',
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'sales_orders', docId, {
          status: 'confirmed',
        });
      },
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'sales_orders', docId, {
          status: 'rejected',
        });
      },
    );
    // Customer return: stock re-enters ONLY on final approval.
    this.approvalsService.registerDocType(
      'sales_return',
      async (tenantId, docId) => {
        await this.supabaseService.callTransaction('post_sales_return', {
          p_tenant_id: tenantId,
          p_doc_id: docId,
        });
      },
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'sales_returns', docId, {
          status: 'rejected',
        });
      },
    );
  }

  // --- shared decoration ------------------------------------------------------

  private async itemRefs(tenantId: string, itemIds: string[]): Promise<Map<string, ItemRef>> {
    if (itemIds.length === 0) return new Map();
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'items', 'id, sku, name')
      .in('id', [...new Set(itemIds)])) as unknown as { data: ItemRef[] | null };
    return new Map((data ?? []).map((item) => [item.id, item]));
  }

  private async partnerNames(tenantId: string, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'partners', 'id, name')
      .in('id', [...new Set(ids)])) as unknown as { data: { id: string; name: string }[] | null };
    return new Map((data ?? []).map((p) => [p.id, p.name]));
  }

  // --- sales orders -----------------------------------------------------------

  async listSos(tenantId: string): Promise<SalesOrderDoc[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_orders')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: SoRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateSo(tenantId, row)));
  }

  async getSo(tenantId: string, id: string): Promise<SalesOrderDoc> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_orders')
      .eq('id', id)
      .maybeSingle()) as { data: SoRow | null };
    if (!data) throw new NotFoundException(`Sales order ${id} not found`);
    return this.hydrateSo(tenantId, data);
  }

  private async hydrateSo(tenantId: string, row: SoRow): Promise<SalesOrderDoc> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_order_lines')
      .eq('so_id', row.id)) as unknown as { data: SoLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const customers = await this.partnerNames(tenantId, [row.customer_id]);
    return {
      id: row.id,
      docNo: row.doc_no,
      customerId: row.customer_id,
      customerName: customers.get(row.customer_id),
      warehouseId: row.warehouse_id,
      orderDate: row.order_date,
      expectedDate: row.expected_date,
      status: row.status,
      subtotal: row.subtotal,
      taxTotal: row.tax_total,
      total: row.total,
      notes: row.notes,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        qty: line.qty,
        unitPrice: line.unit_price,
        taxId: line.tax_id,
        lineTotal: line.line_total,
        qtyDelivered: line.qty_delivered,
        qtyInvoiced: line.qty_invoiced,
      })),
    };
  }

  async createSo(
    tenantId: string,
    dto: CreateSalesOrderDto,
    createdBy?: string,
  ): Promise<SalesOrderDoc> {
    if (dto.lines.length === 0) throw new BadRequestException('An SO needs at least one line');

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
      p_doc_type: 'sales_order',
    });

    const { data: so, error } = (await this.supabaseService
      .insertTenant(tenantId, 'sales_orders', {
        doc_no: docNo,
        customer_id: dto.customerId,
        warehouse_id: dto.warehouseId,
        expected_date: dto.expectedDate,
        subtotal,
        tax_total: taxTotal,
        total: subtotal + taxTotal,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: SoRow | null; error: QueryError };
    if (error || !so) throw new ConflictException(error?.message ?? 'Failed to create SO');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'sales_order_lines',
      dto.lines.map((line) => ({
        so_id: so.id,
        item_id: line.itemId,
        qty: line.qty,
        unit_price: line.unitPrice,
        tax_id: line.taxId,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'sales_orders', so.id);
      throw new BadRequestException(lineError.message);
    }
    return this.getSo(tenantId, so.id);
  }

  /**
   * Draft -> confirmed directly, or through the approval chain when the org's
   * total threshold OR the customer's credit limit (open invoices + this
   * order) says a human has to sign off.
   */
  async submitSo(tenantId: string, id: string, requestedBy?: string): Promise<SalesOrderDoc> {
    const so = await this.getSo(tenantId, id);
    if (so.status !== 'draft') throw new ConflictException('Only draft SOs can be submitted');

    const { data: settings } = (await this.supabaseService
      .selectTenant(tenantId, 'org_settings', 'so_approval_min_total')
      .maybeSingle()) as { data: { so_approval_min_total: number | null } | null };
    const threshold = settings?.so_approval_min_total;
    const overThreshold = threshold != null && so.total >= Number(threshold);

    const { data: customer } = (await this.supabaseService
      .selectTenant(tenantId, 'partners', 'credit_limit')
      .eq('id', so.customerId)
      .maybeSingle()) as { data: { credit_limit: number | null } | null };

    let creditBreached = false;
    if (customer?.credit_limit != null) {
      const { data: openInvoices } = (await this.supabaseService
        .selectTenant(tenantId, 'sales_invoices', 'total')
        .eq('customer_id', so.customerId)
        .eq('status', 'open')) as unknown as { data: { total: number }[] | null };
      const openAr = (openInvoices ?? []).reduce((sum, inv) => sum + Number(inv.total), 0);
      creditBreached = openAr + so.total > Number(customer.credit_limit);
    }

    if (overThreshold || creditBreached) {
      await this.supabaseService.updateTenant(tenantId, 'sales_orders', id, {
        status: 'pending_approval',
      });
      await this.approvalsService.submit(tenantId, 'sales_order', id, {
        reasonText: creditBreached
          ? `SO ${so.docNo}: customer credit limit would be exceeded (open invoices + this order)`
          : `SO ${so.docNo} total ${so.total} meets the approval threshold`,
        requestedBy,
      });
    } else {
      await this.supabaseService.updateTenant(tenantId, 'sales_orders', id, {
        status: 'confirmed',
      });
    }
    return this.getSo(tenantId, id);
  }

  async cancelSo(tenantId: string, id: string): Promise<SalesOrderDoc> {
    const so = await this.getSo(tenantId, id);
    if (!['draft', 'confirmed'].includes(so.status)) {
      throw new ConflictException('Only draft or confirmed SOs can be cancelled');
    }
    if (so.lines.some((line) => line.qtyDelivered > 0)) {
      throw new ConflictException(
        'Cannot cancel an SO with delivered goods — process a customer return instead',
      );
    }
    await this.supabaseService.updateTenant(tenantId, 'sales_orders', id, {
      status: 'cancelled',
    });
    return this.getSo(tenantId, id);
  }

  // --- deliveries -------------------------------------------------------------

  async listDeliveries(tenantId: string, soId?: string): Promise<DeliveryNote[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'deliveries');
    if (soId) builder = builder.eq('so_id', soId);
    const { data, error } = (await builder
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: DeliveryRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateDelivery(tenantId, row)));
  }

  private async hydrateDelivery(tenantId: string, row: DeliveryRow): Promise<DeliveryNote> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'delivery_lines')
      .eq('delivery_id', row.id)) as unknown as { data: DeliveryLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const { data: so } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_orders', 'doc_no')
      .eq('id', row.so_id)
      .maybeSingle()) as { data: { doc_no: string } | null };
    return {
      id: row.id,
      docNo: row.doc_no,
      soId: row.so_id,
      soDocNo: so?.doc_no,
      warehouseId: row.warehouse_id,
      status: row.status,
      notes: row.notes,
      postedAt: row.posted_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        soLineId: line.so_line_id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        batchId: line.batch_id,
        qty: line.qty,
      })),
    };
  }

  /** Creates AND posts — dispatch is one action at the loading dock. Stock leaves at moving average (COGS). */
  async deliverGoods(
    tenantId: string,
    dto: CreateDeliveryDto,
    createdBy?: string,
  ): Promise<DeliveryNote> {
    if (dto.lines.length === 0) throw new BadRequestException('Nothing to deliver');
    const so = await this.getSo(tenantId, dto.soId);
    if (so.status !== 'confirmed') {
      throw new ConflictException('Goods can only be delivered against a confirmed SO');
    }

    const soLines = new Map(so.lines.map((line) => [line.id, line]));
    for (const line of dto.lines) {
      const soLine = soLines.get(line.soLineId);
      if (!soLine) throw new BadRequestException('Line does not belong to this SO');
      if (soLine.qtyDelivered + line.qty > soLine.qty) {
        throw new BadRequestException(
          `Delivering ${line.qty} of ${soLine.itemSku ?? soLine.itemId} exceeds the remaining ${soLine.qty - soLine.qtyDelivered}`,
        );
      }
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'delivery_note',
    });

    const { data: delivery, error } = (await this.supabaseService
      .insertTenant(tenantId, 'deliveries', {
        doc_no: docNo,
        so_id: dto.soId,
        warehouse_id: so.warehouseId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: DeliveryRow | null; error: QueryError };
    if (error || !delivery) {
      throw new ConflictException(error?.message ?? 'Failed to create delivery');
    }

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'delivery_lines',
      dto.lines.map((line) => {
        const soLine = soLines.get(line.soLineId);
        return {
          delivery_id: delivery.id,
          so_line_id: line.soLineId,
          item_id: soLine?.itemId,
          batch_id: line.batchId,
          qty: line.qty,
        };
      }),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'deliveries', delivery.id);
      throw new BadRequestException(lineError.message);
    }

    await this.supabaseService.callTransaction('post_delivery', {
      p_tenant_id: tenantId,
      p_doc_id: delivery.id,
    });

    const deliveries = await this.listDeliveries(tenantId, dto.soId);
    const posted = deliveries.find((d) => d.id === delivery.id);
    if (!posted) throw new NotFoundException('Delivery disappeared after posting');
    return posted;
  }

  // --- sales invoices (matched to delivered quantities) -----------------------

  async listInvoices(tenantId: string): Promise<SalesInvoice[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_invoices')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: InvoiceRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateInvoice(tenantId, row)));
  }

  private async hydrateInvoice(tenantId: string, row: InvoiceRow): Promise<SalesInvoice> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_invoice_lines')
      .eq('invoice_id', row.id)) as unknown as { data: InvoiceLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const customers = await this.partnerNames(tenantId, [row.customer_id]);
    const { data: so } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_orders', 'doc_no')
      .eq('id', row.so_id)
      .maybeSingle()) as { data: { doc_no: string } | null };
    return {
      id: row.id,
      docNo: row.doc_no,
      soId: row.so_id,
      soDocNo: so?.doc_no,
      customerId: row.customer_id,
      customerName: customers.get(row.customer_id),
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      status: row.status,
      subtotal: row.subtotal,
      taxTotal: row.tax_total,
      total: row.total,
      notes: row.notes,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        soLineId: line.so_line_id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        qty: line.qty,
        unitPrice: line.unit_price,
        lineTotal: line.line_total,
      })),
    };
  }

  /** Invoice quantities must fit within delivered-not-yet-invoiced, priced from the SO unless overridden. */
  async createInvoice(
    tenantId: string,
    dto: CreateSalesInvoiceDto,
    createdBy?: string,
  ): Promise<SalesInvoice> {
    if (dto.lines.length === 0) {
      throw new BadRequestException('An invoice needs at least one line');
    }
    const so = await this.getSo(tenantId, dto.soId);
    const soLines = new Map(so.lines.map((line) => [line.id, line]));

    const { data: taxes } = (await this.supabaseService.selectTenant(
      tenantId,
      'taxes',
      'id, rate',
    )) as unknown as { data: { id: string; rate: number }[] | null };
    const taxRate = new Map((taxes ?? []).map((t) => [t.id, Number(t.rate)]));

    let subtotal = 0;
    let taxTotal = 0;
    for (const line of dto.lines) {
      const soLine = soLines.get(line.soLineId);
      if (!soLine) throw new BadRequestException('Line does not belong to this SO');
      const invoiceable = soLine.qtyDelivered - soLine.qtyInvoiced;
      if (line.qty > invoiceable) {
        throw new BadRequestException(
          `Invoicing ${line.qty} of ${soLine.itemSku ?? soLine.itemId} exceeds delivered-uninvoiced ${invoiceable}`,
        );
      }
      const lineTotal = line.qty * (line.unitPrice ?? soLine.unitPrice);
      subtotal += lineTotal;
      if (soLine.taxId) taxTotal += lineTotal * ((taxRate.get(soLine.taxId) ?? 0) / 100);
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'sales_invoice',
    });

    const { data: invoice, error } = (await this.supabaseService
      .insertTenant(tenantId, 'sales_invoices', {
        doc_no: docNo,
        so_id: dto.soId,
        customer_id: so.customerId,
        invoice_date: dto.invoiceDate,
        due_date: dto.dueDate,
        subtotal,
        tax_total: taxTotal,
        total: subtotal + taxTotal,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: InvoiceRow | null; error: QueryError };
    if (error || !invoice) {
      throw new ConflictException(error?.message ?? 'Failed to create invoice');
    }

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'sales_invoice_lines',
      dto.lines.map((line) => {
        const soLine = soLines.get(line.soLineId);
        return {
          invoice_id: invoice.id,
          so_line_id: line.soLineId,
          item_id: soLine?.itemId,
          qty: line.qty,
          unit_price: line.unitPrice ?? soLine?.unitPrice ?? 0,
        };
      }),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'sales_invoices', invoice.id);
      throw new BadRequestException(lineError.message);
    }

    // Advance invoiced counters (the DB check constraint backstops the cap).
    for (const line of dto.lines) {
      const soLine = soLines.get(line.soLineId);
      if (soLine) {
        await this.supabaseService.updateTenant(tenantId, 'sales_order_lines', line.soLineId, {
          qty_invoiced: soLine.qtyInvoiced + line.qty,
        });
      }
    }

    const invoices = await this.listInvoices(tenantId);
    const created = invoices.find((inv) => inv.id === invoice.id);
    if (!created) throw new NotFoundException('Invoice disappeared after creation');
    return created;
  }

  // --- customer returns (reason-coded AND approval-gated) ---------------------

  async listReturns(tenantId: string): Promise<SalesReturnDoc[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'sales_returns')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: ReturnRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const result: SalesReturnDoc[] = [];
    for (const row of data ?? []) {
      const { data: lines } = (await this.supabaseService
        .selectTenant(tenantId, 'sales_return_lines')
        .eq('return_id', row.id)) as unknown as { data: ReturnLineRow[] | null };
      const items = await this.itemRefs(
        tenantId,
        (lines ?? []).map((l) => l.item_id),
      );
      const customers = await this.partnerNames(tenantId, [row.customer_id]);
      let reasonLabel: string | null = null;
      if (row.reason_code_id) {
        const { data: reason } = (await this.supabaseService
          .selectTenant(tenantId, 'reason_codes', 'label')
          .eq('id', row.reason_code_id)
          .maybeSingle()) as { data: { label: string } | null };
        reasonLabel = reason?.label ?? null;
      }
      result.push({
        id: row.id,
        docNo: row.doc_no,
        customerId: row.customer_id,
        customerName: customers.get(row.customer_id),
        warehouseId: row.warehouse_id,
        reasonCode: reasonLabel,
        reasonText: row.reason_text,
        status: row.status,
        postedAt: row.posted_at,
        createdAt: row.created_at,
        lines: (lines ?? []).map((line) => ({
          id: line.id,
          itemId: line.item_id,
          itemSku: items.get(line.item_id)?.sku,
          itemName: items.get(line.item_id)?.name,
          batchId: line.batch_id,
          qty: line.qty,
        })),
      });
    }
    return result;
  }

  /**
   * Creates the return and submits it into the approval chain in one step.
   * Stock does NOT move here — the approvals engine calls post_sales_return
   * only when the final approver signs off.
   */
  async createReturn(
    tenantId: string,
    dto: CreateSalesReturnDto,
    createdBy?: string,
  ): Promise<SalesReturnDoc[]> {
    if (dto.lines.length === 0) throw new BadRequestException('A return needs at least one line');
    if (!dto.reasonCodeId && !dto.reasonText?.trim()) {
      throw new BadRequestException('A reason is required for a customer return');
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'sales_return',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'sales_returns', {
        doc_no: docNo,
        customer_id: dto.customerId,
        warehouse_id: dto.warehouseId,
        reason_code_id: dto.reasonCodeId,
        reason_text: dto.reasonText,
        status: 'pending_approval',
        created_by: createdBy,
      })
      .select()
      .single()) as { data: ReturnRow | null; error: QueryError };
    if (error || !doc) throw new ConflictException(error?.message ?? 'Failed to create return');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'sales_return_lines',
      dto.lines.map((line) => ({
        return_id: doc.id,
        item_id: line.itemId,
        batch_id: line.batchId,
        qty: line.qty,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'sales_returns', doc.id);
      throw new BadRequestException(lineError.message);
    }

    await this.approvalsService.submit(tenantId, 'sales_return', doc.id, {
      reasonCodeId: dto.reasonCodeId,
      reasonText: dto.reasonText,
      requestedBy: createdBy,
    });

    return this.listReturns(tenantId);
  }
}
