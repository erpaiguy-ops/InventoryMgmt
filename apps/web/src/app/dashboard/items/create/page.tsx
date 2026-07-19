'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ItemForm } from '@/components/items/item-form';
import { useCreateItem } from '@/hooks/use-items';

export default function CreateItemPage() {
  const router = useRouter();
  const createItem = useCreateItem();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New item</h1>
      <ItemForm
        submitting={createItem.isPending}
        onSubmit={(payload) =>
          createItem.mutate(payload, {
            onSuccess: (item) => {
              toast.success(`Item ${item.sku} created`);
              router.push('/dashboard/items');
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create item'),
          })
        }
      />
    </div>
  );
}
