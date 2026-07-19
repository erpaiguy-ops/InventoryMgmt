import type {
  Batch,
  ReorderRule,
  ReorderSuggestion,
  StockAdjustment,
  StockAudit,
  StockBalance,
  StockLedgerEntry,
  StockTransfer,
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
  CreateAdjustmentDto,
  CreateAuditDto,
  CreateTransferDto,
  EnterAuditCountsDto,
  ReorderRuleDto,
  SubmitForApprovalDto,
} from './dto/inventory.dto';

type QueryError = { message: string } | null;

interface BalanceRow {
  id: string;
  item_id: string;
  warehouse_id: string;
  batch_id: string | null;
  qty_on_hand: number;
}
interface LedgerRow {
  id: string;
  item_id: string;
  warehouse_id: string;
  batch_id: string | null;
  qty: number;
  unit_cost: number | null;
  movement_type: StockLedgerEntry['movementType'];
  source_doc_type: string;
  source_doc_id: string;
  notes: string | null;
  created_at: string;
}
interface TransferRow {
  id: string;
  doc_no: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: StockTransfer['status'];
  notes: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
}
interface TransferLineRow {
  id: string;
  item_id: string;
  batch_id: string | null;
  qty: number;
}
interface AdjustmentRow {
  id: string;
  doc_no: string;
  warehouse_id: string;
  status: StockAdjustment['status'];
  is_opening: boolean;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
}
interface AdjustmentLineRow {
  id: string;
  item_id: string;
  batch_no: string | null;
  expiry_date: string | null;
  qty_change: number;
  unit_cost: number | null;
}
interface AuditRow {
  id: string;
  doc_no: string;
  warehouse_id: string;
  status: StockAudit['status'];
  notes: string | null;
  posted_at: string | null;
  created_at: string;
}
interface AuditLineRow {
  id: string;
  item_id: string;
  batch_id: string | null;
  system_qty: number;
  counted_qty: number | null;
}
interface BatchRow {
  id: string;
  item_id: string;
  batch_no: string;
  mfg_date: string | null;
  expiry_date: string | null;
}
interface RuleRow {
  id: string;
  item_id: string;
  warehouse_id: string;
  min_qty: number;
  reorder_qty: number;
  preferred_supplier_id: string | null;
}
interface ItemRef {
  id: string;
  sku: string;
  name: string;
}

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  /** Register the post/reject callbacks so final approvals actually move stock. */
  onModuleInit(): void {
    this.approvalsService.registerDocType(
      'stock_adjustment',
      (tenantId, docId) =>
        this.supabaseService.callTransaction('post_stock_adjustment', {
          p_tenant_id: tenantId,
          p_doc_id: docId,
        }),
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'stock_adjustments', docId, {
          status: 'rejected',
        });
      },
    );
    this.approvalsService.registerDocType(
      'stock_audit',
      (tenantId, docId) =>
        this.supabaseService.callTransaction('post_stock_audit', {
          p_tenant_id: tenantId,
          p_doc_id: docId,
        }),
      async (tenantId, docId) => {
        await this.supabaseService.updateTenant(tenantId, 'stock_audits', docId, {
          status: 'rejected',
        });
      },
    );
  }

  // --- item name decoration ---------------------------------------------------

  private async itemRefs(tenantId: string, itemIds: string[]): Promise<Map<string, ItemRef>> {
    if (itemIds.length === 0) return new Map();
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'items', 'id, sku, name')
      .in('id', [...new Set(itemIds)])) as unknown as { data: ItemRef[] | null };
    return new Map((data ?? []).map((item) => [item.id, item]));
  }

  private async batchRefs(
    tenantId: string,
    batchIds: (string | null)[],
  ): Promise<Map<string, BatchRow>> {
    const ids = [...new Set(batchIds.filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return new Map();
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'batches')
      .in('id', ids)) as unknown as { data: BatchRow[] | null };
    return new Map((data ?? []).map((batch) => [batch.id, batch]));
  }

  // --- balances & ledger ------------------------------------------------------

  async balances(tenantId: string, warehouseId?: string): Promise<StockBalance[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'stock_balances');
    if (warehouseId) builder = builder.eq('warehouse_id', warehouseId);
    const { data, error } = (await builder.order('updated_at', {
      ascending: false,
    })) as unknown as { data: BalanceRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const rows = data ?? [];
    const [items, batches, warehouses] = await Promise.all([
      this.itemRefs(
        tenantId,
        rows.map((r) => r.item_id),
      ),
      this.batchRefs(
        tenantId,
        rows.map((r) => r.batch_id),
      ),
      this.warehouseRefs(tenantId),
    ]);

    return rows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      itemSku: items.get(row.item_id)?.sku,
      itemName: items.get(row.item_id)?.name,
      warehouseId: row.warehouse_id,
      warehouseCode: warehouses.get(row.warehouse_id),
      batchId: row.batch_id,
      batchNo: row.batch_id ? batches.get(row.batch_id)?.batch_no : null,
      expiryDate: row.batch_id ? (batches.get(row.batch_id)?.expiry_date ?? null) : null,
      qtyOnHand: row.qty_on_hand,
    }));
  }

  async ledger(
    tenantId: string,
    filters: { itemId?: string; warehouseId?: string; limit?: number },
  ): Promise<StockLedgerEntry[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'stock_ledger');
    if (filters.itemId) builder = builder.eq('item_id', filters.itemId);
    if (filters.warehouseId) builder = builder.eq('warehouse_id', filters.warehouseId);
    const { data, error } = (await builder
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100)) as unknown as { data: LedgerRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const rows = data ?? [];
    const [items, warehouses] = await Promise.all([
      this.itemRefs(
        tenantId,
        rows.map((r) => r.item_id),
      ),
      this.warehouseRefs(tenantId),
    ]);
    return rows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      itemSku: items.get(row.item_id)?.sku,
      itemName: items.get(row.item_id)?.name,
      warehouseId: row.warehouse_id,
      warehouseCode: warehouses.get(row.warehouse_id),
      batchId: row.batch_id,
      qty: row.qty,
      unitCost: row.unit_cost,
      movementType: row.movement_type,
      sourceDocType: row.source_doc_type,
      sourceDocId: row.source_doc_id,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  private async warehouseRefs(tenantId: string): Promise<Map<string, string>> {
    const { data } = (await this.supabaseService.selectTenant(
      tenantId,
      'warehouses',
      'id, code',
    )) as unknown as {
      data: { id: string; code: string }[] | null;
    };
    return new Map((data ?? []).map((w) => [w.id, w.code]));
  }

  // --- transfers --------------------------------------------------------------

  async listTransfers(tenantId: string): Promise<StockTransfer[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_transfers')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: TransferRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateTransfer(tenantId, row)));
  }

  async getTransfer(tenantId: string, id: string): Promise<StockTransfer> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_transfers')
      .eq('id', id)
      .maybeSingle()) as { data: TransferRow | null };
    if (!data) throw new NotFoundException(`Transfer ${id} not found`);
    return this.hydrateTransfer(tenantId, data);
  }

  private async hydrateTransfer(tenantId: string, row: TransferRow): Promise<StockTransfer> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_transfer_lines')
      .eq('transfer_id', row.id)) as unknown as { data: TransferLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const batches = await this.batchRefs(
      tenantId,
      (lines ?? []).map((l) => l.batch_id),
    );
    return {
      id: row.id,
      docNo: row.doc_no,
      fromWarehouseId: row.from_warehouse_id,
      toWarehouseId: row.to_warehouse_id,
      status: row.status,
      notes: row.notes,
      dispatchedAt: row.dispatched_at,
      receivedAt: row.received_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        batchId: line.batch_id,
        batchNo: line.batch_id ? batches.get(line.batch_id)?.batch_no : null,
        qty: line.qty,
      })),
    };
  }

  async createTransfer(
    tenantId: string,
    dto: CreateTransferDto,
    createdBy?: string,
  ): Promise<StockTransfer> {
    if (dto.lines.length === 0) throw new BadRequestException('A transfer needs at least one line');
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'stock_transfer',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'stock_transfers', {
        doc_no: docNo,
        from_warehouse_id: dto.fromWarehouseId,
        to_warehouse_id: dto.toWarehouseId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: TransferRow | null; error: QueryError };
    if (error || !doc) throw new ConflictException(error?.message ?? 'Failed to create transfer');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'stock_transfer_lines',
      dto.lines.map((line) => ({
        transfer_id: doc.id,
        item_id: line.itemId,
        batch_id: line.batchId,
        qty: line.qty,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'stock_transfers', doc.id);
      throw new BadRequestException(lineError.message);
    }
    return this.getTransfer(tenantId, doc.id);
  }

  async dispatchTransfer(tenantId: string, id: string): Promise<StockTransfer> {
    await this.supabaseService.callTransaction('post_stock_transfer_dispatch', {
      p_tenant_id: tenantId,
      p_doc_id: id,
    });
    return this.getTransfer(tenantId, id);
  }

  async receiveTransfer(tenantId: string, id: string): Promise<StockTransfer> {
    await this.supabaseService.callTransaction('post_stock_transfer_receive', {
      p_tenant_id: tenantId,
      p_doc_id: id,
    });
    return this.getTransfer(tenantId, id);
  }

  // --- adjustments (approval-gated) --------------------------------------------

  async listAdjustments(tenantId: string): Promise<StockAdjustment[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_adjustments')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: AdjustmentRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateAdjustment(tenantId, row)));
  }

  async getAdjustment(tenantId: string, id: string): Promise<StockAdjustment> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_adjustments')
      .eq('id', id)
      .maybeSingle()) as { data: AdjustmentRow | null };
    if (!data) throw new NotFoundException(`Adjustment ${id} not found`);
    return this.hydrateAdjustment(tenantId, data);
  }

  private async hydrateAdjustment(tenantId: string, row: AdjustmentRow): Promise<StockAdjustment> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_adjustment_lines')
      .eq('adjustment_id', row.id)) as unknown as { data: AdjustmentLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    return {
      id: row.id,
      docNo: row.doc_no,
      warehouseId: row.warehouse_id,
      status: row.status,
      isOpening: row.is_opening,
      notes: row.notes,
      postedAt: row.posted_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        batchNo: line.batch_no,
        expiryDate: line.expiry_date,
        qtyChange: line.qty_change,
        unitCost: line.unit_cost,
      })),
    };
  }

  async createAdjustment(
    tenantId: string,
    dto: CreateAdjustmentDto,
    createdBy?: string,
  ): Promise<StockAdjustment> {
    if (dto.lines.length === 0) {
      throw new BadRequestException('An adjustment needs at least one line');
    }
    for (const line of dto.lines) {
      if (line.qtyChange > 0 && line.unitCost == null) {
        throw new BadRequestException(
          'Positive quantity changes need a unit cost so valuation stays honest',
        );
      }
    }

    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'stock_adjustment',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'stock_adjustments', {
        doc_no: docNo,
        warehouse_id: dto.warehouseId,
        is_opening: dto.isOpening ?? false,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: AdjustmentRow | null; error: QueryError };
    if (error || !doc) throw new ConflictException(error?.message ?? 'Failed to create adjustment');

    const { error: lineError } = await this.supabaseService.insertTenant(
      tenantId,
      'stock_adjustment_lines',
      dto.lines.map((line) => ({
        adjustment_id: doc.id,
        item_id: line.itemId,
        batch_no: line.batchNo,
        expiry_date: line.expiryDate,
        qty_change: line.qtyChange,
        unit_cost: line.unitCost,
      })),
    );
    if (lineError) {
      await this.supabaseService.deleteTenant(tenantId, 'stock_adjustments', doc.id);
      throw new BadRequestException(lineError.message);
    }
    return this.getAdjustment(tenantId, doc.id);
  }

  /** Draft -> pending_approval + approval request. Stock moves only when the chain finishes. */
  async submitAdjustment(
    tenantId: string,
    id: string,
    dto: SubmitForApprovalDto,
    requestedBy?: string,
  ): Promise<StockAdjustment> {
    const adjustment = await this.getAdjustment(tenantId, id);
    if (adjustment.status !== 'draft') {
      throw new ConflictException('Only draft adjustments can be submitted');
    }
    if (!dto.reasonCodeId && !dto.reasonText?.trim()) {
      throw new BadRequestException('A reason is required to submit for approval');
    }

    await this.supabaseService.updateTenant(tenantId, 'stock_adjustments', id, {
      status: 'pending_approval',
    });
    await this.approvalsService.submit(tenantId, 'stock_adjustment', id, {
      reasonCodeId: dto.reasonCodeId,
      reasonText: dto.reasonText,
      requestedBy,
    });
    return this.getAdjustment(tenantId, id);
  }

  // --- stock audits (approval-gated) -------------------------------------------

  async listAudits(tenantId: string): Promise<StockAudit[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_audits')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: AuditRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateAudit(tenantId, row)));
  }

  async getAudit(tenantId: string, id: string): Promise<StockAudit> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_audits')
      .eq('id', id)
      .maybeSingle()) as { data: AuditRow | null };
    if (!data) throw new NotFoundException(`Stock audit ${id} not found`);
    return this.hydrateAudit(tenantId, data);
  }

  private async hydrateAudit(tenantId: string, row: AuditRow): Promise<StockAudit> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_audit_lines')
      .eq('audit_id', row.id)) as unknown as { data: AuditLineRow[] | null };
    const items = await this.itemRefs(
      tenantId,
      (lines ?? []).map((l) => l.item_id),
    );
    const batches = await this.batchRefs(
      tenantId,
      (lines ?? []).map((l) => l.batch_id),
    );
    return {
      id: row.id,
      docNo: row.doc_no,
      warehouseId: row.warehouse_id,
      status: row.status,
      notes: row.notes,
      postedAt: row.posted_at,
      createdAt: row.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemSku: items.get(line.item_id)?.sku,
        itemName: items.get(line.item_id)?.name,
        batchId: line.batch_id,
        batchNo: line.batch_id ? batches.get(line.batch_id)?.batch_no : null,
        systemQty: line.system_qty,
        countedQty: line.counted_qty,
      })),
    };
  }

  /** Creates the audit with a count sheet snapshotted from current balances. */
  async createAudit(
    tenantId: string,
    dto: CreateAuditDto,
    createdBy?: string,
  ): Promise<StockAudit> {
    const docNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'stock_audit',
    });

    const { data: doc, error } = (await this.supabaseService
      .insertTenant(tenantId, 'stock_audits', {
        doc_no: docNo,
        warehouse_id: dto.warehouseId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: AuditRow | null; error: QueryError };
    if (error || !doc) throw new ConflictException(error?.message ?? 'Failed to create audit');

    const { data: balances } = (await this.supabaseService
      .selectTenant(tenantId, 'stock_balances')
      .eq('warehouse_id', dto.warehouseId)) as unknown as { data: BalanceRow[] | null };

    if ((balances ?? []).length > 0) {
      const { error: lineError } = await this.supabaseService.insertTenant(
        tenantId,
        'stock_audit_lines',
        (balances ?? []).map((balance) => ({
          audit_id: doc.id,
          item_id: balance.item_id,
          batch_id: balance.batch_id,
          system_qty: balance.qty_on_hand,
        })),
      );
      if (lineError) {
        await this.supabaseService.deleteTenant(tenantId, 'stock_audits', doc.id);
        throw new BadRequestException(lineError.message);
      }
    }
    return this.getAudit(tenantId, doc.id);
  }

  async enterAuditCounts(
    tenantId: string,
    id: string,
    dto: EnterAuditCountsDto,
  ): Promise<StockAudit> {
    const audit = await this.getAudit(tenantId, id);
    if (audit.status !== 'counting') {
      throw new ConflictException('Counts can only be entered while the audit is in counting');
    }
    for (const count of dto.counts) {
      await this.supabaseService.updateTenant(tenantId, 'stock_audit_lines', count.lineId, {
        counted_qty: count.countedQty,
      });
    }
    return this.getAudit(tenantId, id);
  }

  async submitAudit(
    tenantId: string,
    id: string,
    dto: SubmitForApprovalDto,
    requestedBy?: string,
  ): Promise<StockAudit> {
    const audit = await this.getAudit(tenantId, id);
    if (audit.status !== 'counting') {
      throw new ConflictException('Only audits in counting can be submitted');
    }
    if (!audit.lines.some((line) => line.countedQty != null)) {
      throw new BadRequestException('Enter at least one counted quantity before submitting');
    }

    await this.supabaseService.updateTenant(tenantId, 'stock_audits', id, {
      status: 'pending_approval',
    });
    await this.approvalsService.submit(tenantId, 'stock_audit', id, {
      reasonCodeId: dto.reasonCodeId,
      reasonText: dto.reasonText,
      requestedBy,
    });
    return this.getAudit(tenantId, id);
  }

  // --- reorder rules & suggestions ---------------------------------------------

  async listReorderRules(tenantId: string): Promise<ReorderRule[]> {
    const { data, error } = (await this.supabaseService.selectTenant(
      tenantId,
      'reorder_rules',
    )) as unknown as {
      data: RuleRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    const rows = data ?? [];
    const items = await this.itemRefs(
      tenantId,
      rows.map((r) => r.item_id),
    );
    return rows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      itemSku: items.get(row.item_id)?.sku,
      itemName: items.get(row.item_id)?.name,
      warehouseId: row.warehouse_id,
      minQty: row.min_qty,
      reorderQty: row.reorder_qty,
      preferredSupplierId: row.preferred_supplier_id,
    }));
  }

  async upsertReorderRule(tenantId: string, dto: ReorderRuleDto): Promise<ReorderRule[]> {
    const { data: existing } = (await this.supabaseService
      .selectTenant(tenantId, 'reorder_rules', 'id')
      .eq('item_id', dto.itemId)
      .eq('warehouse_id', dto.warehouseId)
      .maybeSingle()) as { data: { id: string } | null };

    if (existing) {
      await this.supabaseService.updateTenant(tenantId, 'reorder_rules', existing.id, {
        min_qty: dto.minQty,
        reorder_qty: dto.reorderQty,
        preferred_supplier_id: dto.preferredSupplierId,
      });
    } else {
      const { error } = await this.supabaseService.insertTenant(tenantId, 'reorder_rules', {
        item_id: dto.itemId,
        warehouse_id: dto.warehouseId,
        min_qty: dto.minQty,
        reorder_qty: dto.reorderQty,
        preferred_supplier_id: dto.preferredSupplierId,
      });
      if (error) throw new ConflictException(error.message);
    }
    return this.listReorderRules(tenantId);
  }

  async reorderSuggestions(tenantId: string): Promise<ReorderSuggestion[]> {
    const [rules, balances, warehouses] = await Promise.all([
      this.listReorderRules(tenantId),
      this.balances(tenantId),
      this.warehouseRefs(tenantId),
    ]);

    const onHand = new Map<string, number>();
    for (const balance of balances) {
      const key = `${balance.itemId}:${balance.warehouseId}`;
      onHand.set(key, (onHand.get(key) ?? 0) + balance.qtyOnHand);
    }

    const suggestions: ReorderSuggestion[] = [];
    for (const rule of rules) {
      const qty = onHand.get(`${rule.itemId}:${rule.warehouseId}`) ?? 0;
      if (qty < rule.minQty) {
        suggestions.push({
          itemId: rule.itemId,
          itemSku: rule.itemSku ?? '',
          itemName: rule.itemName ?? '',
          warehouseId: rule.warehouseId,
          warehouseCode: warehouses.get(rule.warehouseId) ?? '',
          qtyOnHand: qty,
          minQty: rule.minQty,
          suggestedQty: rule.reorderQty > 0 ? rule.reorderQty : rule.minQty - qty,
          preferredSupplierId: rule.preferredSupplierId,
        });
      }
    }
    return suggestions;
  }

  // --- batches ------------------------------------------------------------------

  async listBatches(tenantId: string, itemId?: string): Promise<Batch[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'batches');
    if (itemId) builder = builder.eq('item_id', itemId);
    const { data, error } = (await builder.order('expiry_date', {
      ascending: true,
      nullsFirst: false,
    })) as unknown as { data: BatchRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      batchNo: row.batch_no,
      mfgDate: row.mfg_date,
      expiryDate: row.expiry_date,
    }));
  }
}
