import type {
  Asset,
  AssetCategory,
  AssetDisposal,
  DepreciationRun,
} from '@inventory-mgmt/shared-types';

import { apiClient } from './api-client';

export interface CreateAssetCategoryPayload {
  name: string;
  defaultMethod: AssetCategory['defaultMethod'];
  defaultLifeMonths: number;
  defaultSalvagePct?: number;
}

export interface CreateAssetPayload {
  name: string;
  categoryId: string;
  acquisitionDate?: string;
  acquisitionCost: number;
  salvageValue?: number;
  usefulLifeMonths: number;
  method: Asset['method'];
  costCenterId?: string;
  purchaseBillId?: string;
  notes?: string;
  fundingAccountId: string;
}

export interface DisposeAssetPayload {
  disposalDate: string;
  proceeds: number;
  depositAccountId: string;
  notes?: string;
}

export const fixedAssetsService = {
  listCategories: () => apiClient.get<AssetCategory[]>('/fixed-assets/categories'),
  createCategory: (p: CreateAssetCategoryPayload) =>
    apiClient.post<AssetCategory>('/fixed-assets/categories', p),

  listAssets: () => apiClient.get<Asset[]>('/fixed-assets/assets'),
  getAsset: (id: string) => apiClient.get<Asset>(`/fixed-assets/assets/${id}`),
  createAsset: (p: CreateAssetPayload) => apiClient.post<Asset>('/fixed-assets/assets', p),
  disposeAsset: (id: string, p: DisposeAssetPayload) =>
    apiClient.post<AssetDisposal>(`/fixed-assets/assets/${id}/dispose`, p),

  listDepreciationRuns: () => apiClient.get<DepreciationRun[]>('/fixed-assets/depreciation-runs'),
  runDepreciation: (runDate: string) =>
    apiClient.post<DepreciationRun>('/fixed-assets/depreciation-runs', { runDate }),

  listDisposals: () => apiClient.get<AssetDisposal[]>('/fixed-assets/disposals'),
};
