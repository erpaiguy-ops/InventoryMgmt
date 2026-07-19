'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PartnerForm } from '@/components/partners/partner-form';
import { useCreatePartner } from '@/hooks/use-partners';

export default function CreatePartnerPage() {
  const router = useRouter();
  const createPartner = useCreatePartner();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New partner</h1>
      <PartnerForm
        submitting={createPartner.isPending}
        onSubmit={(payload) =>
          createPartner.mutate(payload, {
            onSuccess: (partner) => {
              toast.success(`Partner ${partner.name} created`);
              router.push('/dashboard/partners');
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : 'Failed to create partner'),
          })
        }
      />
    </div>
  );
}
