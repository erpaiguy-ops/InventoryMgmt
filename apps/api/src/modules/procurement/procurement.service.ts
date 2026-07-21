import type {
  GoodsReceipt,
  LandedCostVoucher,
  PurchaseBill,
  PurchaseOrderDoc,
  PurchaseReturnDoc,
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
  CreateGoodsReceiptDto,
  CreateLandedCostDto,
  CreatePurchaseBillDto,
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
} from './dto/procurement.dto';

type QueryError = { message: string } | null;

interface PoRow {
  id: string;
  doc_no: string;
  supplier_id: string;
  warehouse_id: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderDoc['status'];
  subtotal: number;
  tax_total: number;
  total: number;
  notes: string | null;
  created_at: string;
}
interface PoLineRow {
  id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  tax_id: string | null;
  line_total: number;
  qty_received: number;
  qty_billed: number;
}
interface GrRow {
  id: string;
  doc_no: string;
  po_id: string;
  warehouse_id: string;
  status: 'draft' | 'posted';
  notes: string | null;
  posted_at: string | null;
  created_at: string;
}
interface GrLineRow {
  id: string;
  po_line_id: string;
  item_id: string;
  qty: number;
  unit_cost: number;
  batch_no: string | null;
  expiry_date: string | null;
}
interface BillRow {
  id: string;
  doc_no: string;
  po_id: string;
  supplier_id: string;
  supplier_bill_no: string | null;
  bill_date: string;
  due_date: string | null;
  status: 'open' | 'paid' | 'cancelled';
  total: number;
  amount_paid: number;
  currency: string;
  fx_rate: number;
  notes: string | null;
  created_at: string;
}
interface BillLineRow {
  id: string;
  po_line_id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
}
interface ReturnRow {
  id: string;
  doc_no: string;
  supplier_id: string;
  warehouse_id: string;
  reason_code_id: string | null;
  reason_text: string | null;
  status: 'posted' | 'cancelled';
  created_at: string;
}
interface ReturnLineRow {
  id: string;
  item_id: string;
  batch_id: string | null;
  qty: number;
}
interface VoucherRow {
  id: string;
  doc_no: string;
  gr_id: string;
  description: string;
  amount: number;
  status: 'draft' | 'posted';
  posted_at: string | null;
  created_at: string;
}
interface ItemRef {
  id: string;
  sku: string;
  name: string;
}

@Injectable()
export class ProcurementService implements OnModuleInit {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  onModuleInit(): void {
    // Final approval confirms the PO; rejection marks it rejected.
    this.approvalsService.registerDocType(
      'purchase_order',
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'purchase_orders', docId, {
          status: 'confirmed',
        });
      },
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'purchase_orders', docId, {
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

  private async orgCurrency(tenantId: string): Promise<string> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'org_settings', 'currency')
      .maybeSingle()) as { data: { currency: string } | null };
    return data?.currency ?? 'USD';
  }

  // --- purchase orders --------------------------------------------------------

  async listPos(tenantId: string): Promise<PurchaseOrderDoc[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: PoRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydratePo(tenantId, row)));
  }

  async getPo(tenantId: string, id: string): Promise<PurchaseOrderDoc> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders')
      .eq('id', id)
      .maybeSingle()) as { data: PoRow | null };
    if (!data) throw new NotFoundException(`Purchase order ${id} not found`);
    return this.hydratePo(tenantId, data);
  }

  private async hydratePo(tenantId: string, row: PoRow): Promise<PurchaseOrderDoc> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_order_lines')
      .eq('po_id', row.id)) as unknown as { data: PoLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const suppliers = await this.partnerNames(tenantId, [row.supplier_id]);
    return {
      id: row.id,
      docNo: row.doc_no,
      supplierId: row.supplier_id,
      supplierName: suppliers.get(row.supplier_id),
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
        qtyReceived: line.qty_received,
        qtyBilled: line.qty_billed,
      })),
    };
  }

  async createPo(
    tenantId: string,
    dto: CreatePurchaseOrderDto,
    createdBy?: string,
  ): Promise<PurchaseOrderDoc> {
    if (dto.lines.length === 0) throw new BadRequestException('A PO needs at least one line');

    // Tax totals from the tenant's tax codes.
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
      p_doc_type: 'purchase_order',
    });

    const { data: po, error } = (await this.supabaseService
      .insertTenant(tenantId, 'purchase_orders', {
        doc_no: docNo,
        supplier_id: dto.supplierId,
        warehouse_id: dto.warehouseId,
        expected_date: dto.expectedDate,
        subtotal,
        tax_total: taxTotal,
        total: subtotal + taxTotal,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: PoRow | null; error: QueryError };
    if (error || !po) throw new ConflictException(error?.message ?? 'Failed to create PO');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'purchase_order_lines',
      dto.lines.map((line) => ({
        po_id: po.id,
        item_id: line.itemId,
        qty: line.qty,
        unit_price: line.unitPrice,
        tax_id: line.taxId,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'purchase_orders', po.id);
      throw new BadRequestException(lineError.message);
    }
    return this.getPo(tenantId, po.id);
  }

  /** Draft -> confirmed directly, or via the approval chain when the org's threshold says so. */
  async submitPo(tenantId: string, id: string, requestedBy?: string): Promise<PurchaseOrderDoc> {
    const po = await this.getPo(tenantId, id);
    if (po.status !== 'draft') throw new ConflictException('Only draft POs can be submitted');

    const { data: settings } = (await this.supabaseService
      .selectTenant(tenantId, 'org_settings', 'po_approval_min_total')
      .maybeSingle()) as { data: { po_approval_min_total: number | null } | null };

    const threshold = settings?.po_approval_min_total;
    const needsApproval = threshold != null && po.total >= Number(threshold);

    if (needsApproval) {
      await this.supabaseService.updateTenant(tenantId, 'purchase_orders', id, {
        status: 'pending_approval',
      });
      await this.approvalsService.submit(tenantId, 'purchase_order', id, {
        reasonText: `PO ${po.docNo} total ${po.total} meets the approval threshold`,
        requestedBy,
      });
    } else {
      await this.supabaseService.updateTenant(tenantId, 'purchase_orders', id, {
        status: 'confirmed',
      });
    }
    return this.getPo(tenantId, id);
  }

  async cancelPo(tenantId: string, id: string): Promise<PurchaseOrderDoc> {
    const po = await this.getPo(tenantId, id);
    if (!['draft', 'confirmed'].includes(po.status)) {
      throw new ConflictException('Only draft or confirmed POs can be cancelled');
    }
    if (po.lines.some((line) => line.qtyReceived > 0)) {
      throw new ConflictException('Cannot cancel a PO with received goods — return them instead');
    }
    await this.supabaseService.updateTenant(tenantId, 'purchase_orders', id, {
      status: 'cancelled',
    });
    return this.getPo(tenantId, id);
  }

  // --- goods receipts ---------------------------------------------------------

  async listGrns(tenantId: string, poId?: string): Promise<GoodsReceipt[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'goods_receipts');
    if (poId) builder = builder.eq('po_id', poId);
    const { data, error } = (await builder
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: GrRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateGrn(tenantId, row)));
  }

  private async hydrateGrn(tenantId: string, row: GrRow): Promise<GoodsReceipt> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'goods_receipt_lines')
      .eq('gr_id', row.id)) as unknown as { data: GrLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const { data: po } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders', 'doc_no')
      .eq('id', row.po_id)
      .maybeSingle()) as { data: { doc_no: string } | null };
    return {
      id: row.id,
      docNo: row.doc_no,
      poId: row.po_id,
      poDocNo: po?.doc_no,
      warehouseId: row.warehouse_id,
      status: row.status,
      notes: row.notes,
      postedAt: row.posted_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        poLineId: line.po_line_id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        qty: line.qty,
        unitCost: line.unit_cost,
        batchNo: line.batch_no,
        expiryDate: line.expiry_date,
      })),
    };
  }

  /** Creates AND posts the receipt — receiving is one action at the warehouse door. */
  async receiveGoods(
    tenantId: string,
    dto: CreateGoodsReceiptDto,
    createdBy?: string,
  ): Promise<GoodsReceipt> {
    if (dto.lines.length === 0) throw new BadRequestException('Nothing to receive');
    const po = await this.getPo(tenantId, dto.poId);
    if (po.status !== 'confirmed') {
      throw new ConflictException('Goods can only be received against a confirmed PO');
    }

    const poLines = new Map(po.lines.map((line) => [line.id, line]));
    for (const line of dto.lines) {
      const poLine = poLines.get(line.poLineId);
      if (!poLine) throw new BadRequestException('Line does not belong to this PO');
      if (poLine.qtyReceived + line.qty > poLine.qty) {
        throw new BadRequestException(
          `Receiving ${line.qty} of ${poLine.itemSku ?? poLine.itemId} exceeds the remaining ${poLine.qty - poLine.qtyReceived}`,
        );
      }
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'goods_receipt',
    });

    const { data: grn, error } = (await this.supabaseService
      .insertTenant(tenantId, 'goods_receipts', {
        doc_no: docNo,
        po_id: dto.poId,
        warehouse_id: po.warehouseId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: GrRow | null; error: QueryError };
    if (error || !grn) throw new ConflictException(error?.message ?? 'Failed to create GRN');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'goods_receipt_lines',
      dto.lines.map((line) => {
        const poLine = poLines.get(line.poLineId);
        return {
          gr_id: grn.id,
          po_line_id: line.poLineId,
          item_id: poLine?.itemId,
          qty: line.qty,
          unit_cost: line.unitCost ?? poLine?.unitPrice ?? 0,
          batch_no: line.batchNo,
          expiry_date: line.expiryDate,
        };
      }),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'goods_receipts', grn.id);
      throw new BadRequestException(lineError.message);
    }

    await this.supabaseService.callTransaction('post_goods_receipt', {
      p_tenant_id: tenantId,
      p_doc_id: grn.id,
    });

    const receipts = await this.listGrns(tenantId, dto.poId);
    const posted = receipts.find((r) => r.id === grn.id);
    if (!posted) throw new NotFoundException('Receipt disappeared after posting');
    return posted;
  }

  // --- purchase bills (three-way matched) --------------------------------------

  async listBills(tenantId: string): Promise<PurchaseBill[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_bills')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: BillRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateBill(tenantId, row)));
  }

  private async hydrateBill(tenantId: string, row: BillRow): Promise<PurchaseBill> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_bill_lines')
      .eq('bill_id', row.id)) as unknown as { data: BillLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const suppliers = await this.partnerNames(tenantId, [row.supplier_id]);
    const { data: po } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_orders', 'doc_no')
      .eq('id', row.po_id)
      .maybeSingle()) as { data: { doc_no: string } | null };
    return {
      id: row.id,
      docNo: row.doc_no,
      poId: row.po_id,
      poDocNo: po?.doc_no,
      supplierId: row.supplier_id,
      supplierName: suppliers.get(row.supplier_id),
      supplierBillNo: row.supplier_bill_no,
      billDate: row.bill_date,
      dueDate: row.due_date,
      status: row.status,
      total: row.total,
      amountPaid: row.amount_paid,
      currency: row.currency,
      fxRate: Number(row.fx_rate),
      notes: row.notes,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        poLineId: line.po_line_id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        qty: line.qty,
        unitPrice: line.unit_price,
        lineTotal: line.line_total,
      })),
    };
  }

  /** Three-way match: every bill line must fit within received-not-yet-billed quantity, priced from the PO unless overridden. */
  async createBill(
    tenantId: string,
    dto: CreatePurchaseBillDto,
    createdBy?: string,
  ): Promise<PurchaseBill> {
    if (dto.lines.length === 0) throw new BadRequestException('A bill needs at least one line');
    const po = await this.getPo(tenantId, dto.poId);
    const poLines = new Map(po.lines.map((line) => [line.id, line]));

    let total = 0;
    for (const line of dto.lines) {
      const poLine = poLines.get(line.poLineId);
      if (!poLine) throw new BadRequestException('Line does not belong to this PO');
      const billable = poLine.qtyReceived - poLine.qtyBilled;
      if (line.qty > billable) {
        throw new BadRequestException(
          `Billing ${line.qty} of ${poLine.itemSku ?? poLine.itemId} exceeds received-unbilled ${billable} (three-way match)`,
        );
      }
      total += line.qty * (line.unitPrice ?? poLine.unitPrice);
    }

    const currency = dto.currency ?? (await this.orgCurrency(tenantId));
    const fxRate = dto.fxRate ?? 1;

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'purchase_bill',
    });

    const { data: bill, error } = (await this.supabaseService
      .insertTenant(tenantId, 'purchase_bills', {
        doc_no: docNo,
        po_id: dto.poId,
        supplier_id: po.supplierId,
        supplier_bill_no: dto.supplierBillNo,
        bill_date: dto.billDate,
        due_date: dto.dueDate,
        total,
        currency,
        fx_rate: fxRate,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: BillRow | null; error: QueryError };
    if (error || !bill) throw new ConflictException(error?.message ?? 'Failed to create bill');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'purchase_bill_lines',
      dto.lines.map((line) => {
        const poLine = poLines.get(line.poLineId);
        return {
          bill_id: bill.id,
          po_line_id: line.poLineId,
          item_id: poLine?.itemId,
          qty: line.qty,
          unit_price: line.unitPrice ?? poLine?.unitPrice ?? 0,
        };
      }),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'purchase_bills', bill.id);
      throw new BadRequestException(lineError.message);
    }

    // Bill clears the goods-received-not-invoiced accrual into a real payable.
    try {
      await this.supabaseService.callTransaction('post_journal_entry', {
        p_tenant_id: tenantId,
        p_entry_date: dto.billDate ?? new Date().toISOString().slice(0, 10),
        p_source_doc_type: 'purchase_bill',
        p_source_doc_id: bill.id,
        p_memo: `Bill ${bill.doc_no} for PO ${po.docNo}`,
        p_lines: [
          { account_role: 'grni', debit: total * fxRate },
          { account_role: 'ap', credit: total * fxRate, partner_id: po.supplierId },
        ],
        p_created_by: createdBy,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'purchase_bills', bill.id);
      throw e;
    }

    // Advance billed counters (the DB check constraint backstops the cap).
    for (const line of dto.lines) {
      const poLine = poLines.get(line.poLineId);
      if (poLine) {
        await this.supabaseService.updateTenant(tenantId, 'purchase_order_lines', line.poLineId, {
          qty_billed: poLine.qtyBilled + line.qty,
        });
      }
    }

    const bills = await this.listBills(tenantId);
    const created = bills.find((b) => b.id === bill.id);
    if (!created) throw new NotFoundException('Bill disappeared after creation');
    return created;
  }

  // --- supplier returns --------------------------------------------------------

  async listReturns(tenantId: string): Promise<PurchaseReturnDoc[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'purchase_returns')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: ReturnRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const result: PurchaseReturnDoc[] = [];
    for (const row of data ?? []) {
      const { data: lines } = (await this.supabaseService
        .selectTenant(tenantId, 'purchase_return_lines')
        .eq('return_id', row.id)) as unknown as { data: ReturnLineRow[] | null };
      const items = await this.itemRefs(
        tenantId,
        (lines ?? []).map((l) => l.item_id),
      );
      const suppliers = await this.partnerNames(tenantId, [row.supplier_id]);
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
        supplierId: row.supplier_id,
        supplierName: suppliers.get(row.supplier_id),
        warehouseId: row.warehouse_id,
        reasonCode: reasonLabel,
        reasonText: row.reason_text,
        status: row.status,
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

  /** Reason-coded, posts immediately: goods leave at current average cost (debit basis for the supplier). */
  async createReturn(
    tenantId: string,
    dto: CreatePurchaseReturnDto,
    createdBy?: string,
  ): Promise<PurchaseReturnDoc[]> {
    if (dto.lines.length === 0) throw new BadRequestException('A return needs at least one line');
    if (!dto.reasonCodeId && !dto.reasonText?.trim()) {
      throw new BadRequestException('A reason is required for a supplier return');
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'purchase_return',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'purchase_returns', {
        doc_no: docNo,
        supplier_id: dto.supplierId,
        warehouse_id: dto.warehouseId,
        reason_code_id: dto.reasonCodeId,
        reason_text: dto.reasonText,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: ReturnRow | null; error: QueryError };
    if (error || !doc) throw new ConflictException(error?.message ?? 'Failed to create return');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'purchase_return_lines',
      dto.lines.map((line) => ({
        return_id: doc.id,
        item_id: line.itemId,
        batch_id: line.batchId,
        qty: line.qty,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'purchase_returns', doc.id);
      throw new BadRequestException(lineError.message);
    }

    await this.supabaseService.callTransaction('post_purchase_return', {
      p_tenant_id: tenantId,
      p_doc_id: doc.id,
    });

    return this.listReturns(tenantId);
  }

  // --- landed costs -------------------------------------------------------------

  async listLandedCosts(tenantId: string): Promise<LandedCostVoucher[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'landed_cost_vouchers')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: VoucherRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const result: LandedCostVoucher[] = [];
    for (const row of data ?? []) {
      const { data: gr } = (await this.supabaseService
        .selectTenant(tenantId, 'goods_receipts', 'doc_no')
        .eq('id', row.gr_id)
        .maybeSingle()) as { data: { doc_no: string } | null };
      result.push({
        id: row.id,
        docNo: row.doc_no,
        grId: row.gr_id,
        grDocNo: gr?.doc_no,
        description: row.description,
        amount: row.amount,
        status: row.status,
        postedAt: row.posted_at,
        createdAt: row.created_at,
      });
    }
    return result;
  }

  /** Creates and posts in one step: freight/duty lands on the receipt's items immediately. */
  async addLandedCost(
    tenantId: string,
    dto: CreateLandedCostDto,
    createdBy?: string,
  ): Promise<LandedCostVoucher[]> {
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'landed_cost',
    });

    const { data: voucher, error } = (await this.supabaseService
      .insertTenant(tenantId, 'landed_cost_vouchers', {
        doc_no: docNo,
        gr_id: dto.grId,
        description: dto.description,
        amount: dto.amount,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: VoucherRow | null; error: QueryError };
    if (error || !voucher)
      throw new ConflictException(error?.message ?? 'Failed to create voucher');

    await this.supabaseService.callTransaction('post_landed_cost', {
      p_tenant_id: tenantId,
      p_doc_id: voucher.id,
    });

    return this.listLandedCosts(tenantId);
  }
}
