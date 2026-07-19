'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  itemsService,
  type CategoryPayload,
  type ItemPayload,
  type ListItemsParams,
  type PriceListPayload,
  type PricePayload,
} from '@/services/items.service';

const ITEMS = 'items';
const CATEGORIES = ['items', 'categories'] as const;
const BRANDS = ['items', 'brands'] as const;
const PRICE_LISTS = ['items', 'price-lists'] as const;

export function useItems(params: ListItemsParams) {
  return useQuery({
    queryKey: [ITEMS, params],
    queryFn: () => itemsService.list(params),
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: [ITEMS, 'detail', id],
    queryFn: () => itemsService.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: ItemPayload) => itemsService.create(p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ITEMS] }),
  });
}

export function useBulkCreateItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ItemPayload[]) => itemsService.bulkCreate(items),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ITEMS] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<ItemPayload>) => itemsService.update(id, p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ITEMS] }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsService.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ITEMS] }),
  });
}

export function useItemCategories() {
  return useQuery({ queryKey: CATEGORIES, queryFn: () => itemsService.listCategories() });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: CategoryPayload) => itemsService.createCategory(p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CATEGORIES }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...p }: { id: string } & Partial<CategoryPayload>) =>
      itemsService.updateCategory(id, p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CATEGORIES }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsService.deleteCategory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CATEGORIES }),
  });
}

export function useBrands() {
  return useQuery({ queryKey: BRANDS, queryFn: () => itemsService.listBrands() });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => itemsService.createBrand(name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRANDS }),
  });
}

export function usePriceLists() {
  return useQuery({ queryKey: PRICE_LISTS, queryFn: () => itemsService.listPriceLists() });
}

export function useCreatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: PriceListPayload) => itemsService.createPriceList(p),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PRICE_LISTS }),
  });
}

export function usePriceListPrices(priceListId: string | undefined) {
  return useQuery({
    queryKey: [...PRICE_LISTS, priceListId, 'prices'],
    queryFn: () => itemsService.listPrices(priceListId as string),
    enabled: Boolean(priceListId),
  });
}

export function useSetPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ priceListId, prices }: { priceListId: string; prices: PricePayload[] }) =>
      itemsService.setPrices(priceListId, prices),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PRICE_LISTS }),
  });
}
