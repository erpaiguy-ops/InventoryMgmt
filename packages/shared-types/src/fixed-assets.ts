/**
 * v2 Phase 6 shared types — Fixed Assets (roadmap M8).
 */

export type DepreciationMethod = 'straight_line' | 'declining_balance';
export type AssetStatus = 'active' | 'fully_depreciated' | 'disposed';

export interface AssetCategory {
  id: string;
  name: string;
  defaultMethod: DepreciationMethod;
  defaultLifeMonths: number;
  defaultSalvagePct: number;
}

export interface Asset {
  id: string;
  assetNo: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  status: AssetStatus;
  accumulatedDepreciation: number;
  netBookValue: number;
  costCenterId: string | null;
  purchaseBillId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DepreciationRunLine {
  id: string;
  assetId: string;
  assetNo?: string;
  assetName?: string;
  amount: number;
}

export interface DepreciationRun {
  id: string;
  runDate: string;
  totalAmount: number;
  postedAt: string;
  lines: DepreciationRunLine[];
}

export interface AssetDisposal {
  id: string;
  assetId: string;
  assetNo?: string;
  assetName?: string;
  disposalDate: string;
  proceeds: number;
  gainLoss: number;
  notes: string | null;
  createdAt: string;
}
