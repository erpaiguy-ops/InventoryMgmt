'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ItemForm } from '@/components/items/item-form';
import { useItem, useUpdateItem } from '@/hooks/use-items';

export default function EditItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading } = useItem(params.id);
  const updateItem = useUpdateItem();

  if (isLoading || !item) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p className="text-muted-foreground font-mono text-sm">{item.sku}</p>
      </div>
      <ItemForm
        initial={item}
        submitting={updateItem.isPending}
        onSubmit={(payload) =>
          updateItem.mutate(
            { id: item.id, ...payload },
            {
              onSuccess: () => {
                toast.success('Item updated');
                router.push('/dashboard/items');
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update item'),
            },
          )
        }
      />
    </div>
  );
}
