'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PartnerForm } from '@/components/partners/partner-form';
import { usePartner, useUpdatePartner } from '@/hooks/use-partners';

export default function EditPartnerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: partner, isLoading } = usePartner(params.id);
  const updatePartner = useUpdatePartner();

  if (isLoading || !partner) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{partner.name}</h1>
        {partner.code && <p className="text-muted-foreground font-mono text-sm">{partner.code}</p>}
      </div>
      <PartnerForm
        initial={partner}
        submitting={updatePartner.isPending}
        onSubmit={(payload) =>
          updatePartner.mutate(
            { id: partner.id, ...payload },
            {
              onSuccess: () => {
                toast.success('Partner updated');
                router.push('/dashboard/partners');
              },
              onError: (e) =>
                toast.error(e instanceof Error ? e.message : 'Failed to update partner'),
            },
          )
        }
      />
    </div>
  );
}
