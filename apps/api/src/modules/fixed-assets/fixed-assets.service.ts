import type {
  Asset,
  AssetCategory,
  AssetDisposal,
  DepreciationRun,
} from '@inventory-mgmt/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import {
  CreateAssetCategoryDto,
  CreateAssetDto,
  DisposeAssetDto,
  RunDepreciationDto,
} from './dto/fixed-assets.dto';

type QueryError = { message: string } | null;

interface CategoryRow {
  id: string;
  name: string;
  default_method: AssetCategory['defaultMethod'];
  default_life_months: number;
  default_salvage_pct: number;
}
interface AssetRow {
  id: string;
  asset_no: string;
  name: string;
  category_id: string;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value: number;
  useful_life_months: number;
  method: Asset['method'];
  status: Asset['status'];
  accumulated_depreciation: number;
  cost_center_id: string | null;
  purchase_bill_id: string | null;
  notes: string | null;
  created_at: string;
}
interface RunRow {
  id: string;
  run_date: string;
  total_amount: number;
  posted_at: string;
}
interface RunLineRow {
  id: string;
  run_id: string;
  asset_id: string;
  amount: number;
}
interface DisposalRow {
  id: string;
  asset_id: string;
  disposal_date: string;
  proceeds: number;
  gain_loss: number;
  notes: string | null;
  created_at: string;
}

const toCategory = (r: CategoryRow): AssetCategory => ({
  id: r.id,
  name: r.name,
  defaultMethod: r.default_method,
  defaultLifeMonths: r.default_life_months,
  defaultSalvagePct: r.default_salvage_pct,
});

@Injectable()
export class FixedAssetsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- asset categories --------------------------------------------------------

  async listCategories(tenantId: string): Promise<AssetCategory[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'asset_categories')
      .order('name')) as unknown as { data: CategoryRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map(toCategory);
  }

  async createCategory(tenantId: string, dto: CreateAssetCategoryDto): Promise<AssetCategory> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'asset_categories', {
        name: dto.name,
        default_method: dto.defaultMethod,
        default_life_months: dto.defaultLifeMonths,
        default_salvage_pct: dto.defaultSalvagePct ?? 0,
      })
      .select()
      .single()) as { data: CategoryRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create category');
    return toCategory(data);
  }

  // --- asset register -------------------------------------------------------------

  async listAssets(tenantId: string): Promise<Asset[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'assets')
      .order('created_at', { ascending: false })) as unknown as {
      data: AssetRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    return this.hydrateAssets(tenantId, data ?? []);
  }

  async getAsset(tenantId: string, id: string): Promise<Asset> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'assets')
      .eq('id', id)
      .maybeSingle()) as { data: AssetRow | null };
    if (!data) throw new NotFoundException(`Asset ${id} not found`);
    const hydrated = await this.hydrateAssets(tenantId, [data]);
    const asset = hydrated[0];
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  private async hydrateAssets(tenantId: string, rows: AssetRow[]): Promise<Asset[]> {
    const categoryIds = [...new Set(rows.map((r) => r.category_id))];
    const { data: categories } = (await this.supabaseService
      .selectTenant(tenantId, 'asset_categories', 'id, name')
      .in('id', categoryIds.length ? categoryIds : [''])) as unknown as {
      data: { id: string; name: string }[] | null;
    };
    const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
    return rows.map((row) => ({
      id: row.id,
      assetNo: row.asset_no,
      name: row.name,
      categoryId: row.category_id,
      categoryName: categoryMap.get(row.category_id),
      acquisitionDate: row.acquisition_date,
      acquisitionCost: row.acquisition_cost,
      salvageValue: row.salvage_value,
      usefulLifeMonths: row.useful_life_months,
      method: row.method,
      status: row.status,
      accumulatedDepreciation: row.accumulated_depreciation,
      netBookValue: row.acquisition_cost - row.accumulated_depreciation,
      costCenterId: row.cost_center_id,
      purchaseBillId: row.purchase_bill_id,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  /** Registers the asset row, then posts Dr Fixed Assets / Cr the chosen funding account — rolling back the asset if posting fails. */
  async createAsset(tenantId: string, dto: CreateAssetDto, createdBy?: string): Promise<Asset> {
    const assetNo = await this.supabaseService.callTransaction<string>('next_doc_number', {
      p_tenant_id: tenantId,
      p_doc_type: 'fixed_asset',
    });

    const { data: asset, error } = (await this.supabaseService
      .insertTenant(tenantId, 'assets', {
        asset_no: assetNo,
        name: dto.name,
        category_id: dto.categoryId,
        acquisition_date: dto.acquisitionDate,
        acquisition_cost: dto.acquisitionCost,
        salvage_value: dto.salvageValue ?? 0,
        useful_life_months: dto.usefulLifeMonths,
        method: dto.method,
        cost_center_id: dto.costCenterId,
        purchase_bill_id: dto.purchaseBillId,
        notes: dto.notes,
        created_by: createdBy,
      })
      .select()
      .single()) as { data: AssetRow | null; error: QueryError };
    if (error || !asset) throw new ConflictException(error?.message ?? 'Failed to create asset');

    try {
      await this.supabaseService.callTransaction('register_asset', {
        p_tenant_id: tenantId,
        p_asset_id: asset.id,
        p_funding_account_id: dto.fundingAccountId,
        p_created_by: createdBy,
      });
    } catch (e) {
      await this.supabaseService.deleteTenant(tenantId, 'assets', asset.id);
      throw e;
    }

    return this.getAsset(tenantId, asset.id);
  }

  // --- depreciation ------------------------------------------------------------

  async listDepreciationRuns(tenantId: string): Promise<DepreciationRun[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'depreciation_runs')
      .order('run_date', { ascending: false })) as unknown as {
      data: RunRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    return Promise.all((data ?? []).map((row) => this.hydrateRun(tenantId, row)));
  }

  private async hydrateRun(tenantId: string, row: RunRow): Promise<DepreciationRun> {
    const { data: lines } = (await this.supabaseService
      .selectTenant(tenantId, 'depreciation_run_lines')
      .eq('run_id', row.id)) as unknown as { data: RunLineRow[] | null };
    const assetIds = [...new Set((lines ?? []).map((l) => l.asset_id))];
    const { data: assets } = (await this.supabaseService
      .selectTenant(tenantId, 'assets', 'id, asset_no, name')
      .in('id', assetIds.length ? assetIds : [''])) as unknown as {
      data: { id: string; asset_no: string; name: string }[] | null;
    };
    const assetMap = new Map((assets ?? []).map((a) => [a.id, a]));
    return {
      id: row.id,
      runDate: row.run_date,
      totalAmount: row.total_amount,
      postedAt: row.posted_at,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        assetId: l.asset_id,
        assetNo: assetMap.get(l.asset_id)?.asset_no,
        assetName: assetMap.get(l.asset_id)?.name,
        amount: l.amount,
      })),
    };
  }

  async runDepreciation(
    tenantId: string,
    dto: RunDepreciationDto,
    createdBy?: string,
  ): Promise<DepreciationRun> {
    const runId = await this.supabaseService.callTransaction<string>('run_depreciation', {
      p_tenant_id: tenantId,
      p_run_date: dto.runDate,
      p_created_by: createdBy,
    });
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'depreciation_runs')
      .eq('id', runId)
      .single()) as { data: RunRow | null };
    if (!data) throw new NotFoundException('Depreciation run disappeared after posting');
    return this.hydrateRun(tenantId, data);
  }

  // --- disposals -----------------------------------------------------------------

  async listDisposals(tenantId: string): Promise<AssetDisposal[]> {
    const { data, error } = (await this.supabaseService
      .selectTenant(tenantId, 'asset_disposals')
      .order('created_at', { ascending: false })) as unknown as {
      data: DisposalRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    const assetIds = [...new Set((data ?? []).map((r) => r.asset_id))];
    const { data: assets } = (await this.supabaseService
      .selectTenant(tenantId, 'assets', 'id, asset_no, name')
      .in('id', assetIds.length ? assetIds : [''])) as unknown as {
      data: { id: string; asset_no: string; name: string }[] | null;
    };
    const assetMap = new Map((assets ?? []).map((a) => [a.id, a]));
    return (data ?? []).map((row) => ({
      id: row.id,
      assetId: row.asset_id,
      assetNo: assetMap.get(row.asset_id)?.asset_no,
      assetName: assetMap.get(row.asset_id)?.name,
      disposalDate: row.disposal_date,
      proceeds: row.proceeds,
      gainLoss: row.gain_loss,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  async disposeAsset(
    tenantId: string,
    assetId: string,
    dto: DisposeAssetDto,
    createdBy?: string,
  ): Promise<AssetDisposal> {
    await this.supabaseService.callTransaction('dispose_asset', {
      p_tenant_id: tenantId,
      p_asset_id: assetId,
      p_disposal_date: dto.disposalDate,
      p_proceeds: dto.proceeds,
      p_deposit_account_id: dto.depositAccountId,
      p_notes: dto.notes ?? null,
      p_created_by: createdBy,
    });

    const disposals = await this.listDisposals(tenantId);
    const created = disposals.find((d) => d.assetId === assetId);
    if (!created) throw new NotFoundException('Disposal disappeared after posting');
    return created;
  }
}
