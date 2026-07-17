/** Storage bucket names used across the app. Create these buckets in the Supabase dashboard. */
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  ATTACHMENTS: 'attachments',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
