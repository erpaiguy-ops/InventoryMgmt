'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fixedAssetsService,
  type CreateAssetCategoryPayload,
  type CreateAssetPayload,
  type DisposeAssetPayload,
} from '@/services/fixed-assets.service';

const FA = 'fixed-assets';

function useInvalidateFixedAssets() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [FA] });
    void queryClient.invalidateQueries({ queryKey: ['financials'] });
  };
}

export function useAssetCategories() {
  return useQuery({
    queryKey: [FA, 'categories'],
    queryFn: () => fixedAssetsService.listCategories(),
  });
}

export function useCreateAssetCategory() {
  const invalidate = useInvalidateFixedAssets();
  return useMutation({
    mutationFn: (p: CreateAssetCategoryPayload) => fixedAssetsService.createCategory(p),
    onSuccess: invalidate,
  });
}

export function useAssets() {
  return useQuery({ queryKey: [FA, 'assets'], queryFn: () => fixedAssetsService.listAssets() });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: [FA, 'assets', id],
    queryFn: () => fixedAssetsService.getAsset(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAsset() {
  const invalidate = useInvalidateFixedAssets();
  return useMutation({
    mutationFn: (p: CreateAssetPayload) => fixedAssetsService.createAsset(p),
    onSuccess: invalidate,
  });
}

export function useDisposeAsset() {
  const invalidate = useInvalidateFixedAssets();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & DisposeAssetPayload) =>
      fixedAssetsService.disposeAsset(id, p),
    onSuccess: invalidate,
  });
}

export function useDepreciationRuns() {
  return useQuery({
    queryKey: [FA, 'depreciation-runs'],
    queryFn: () => fixedAssetsService.listDepreciationRuns(),
  });
}

export function useRunDepreciation() {
  const invalidate = useInvalidateFixedAssets();
  return useMutation({
    mutationFn: (runDate: string) => fixedAssetsService.runDepreciation(runDate),
    onSuccess: invalidate,
  });
}

export function useDisposals() {
  return useQuery({
    queryKey: [FA, 'disposals'],
    queryFn: () => fixedAssetsService.listDisposals(),
  });
}
