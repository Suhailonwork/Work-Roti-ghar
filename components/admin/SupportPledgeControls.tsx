'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateSupportPledgeAction } from '@/lib/actions/settings';
import { Select } from '@/components/ui';

/** Moves a public support offer through its handling states. */
export function PledgeStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      aria-label="Offer status"
      className="h-9 w-32 text-xs"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const result = await updateSupportPledgeAction(id, next);
          if (result.ok) {
            toast.success(result.message ?? 'Updated.');
            router.refresh();
          } else {
            toast.error(result.message ?? 'That did not work.');
          }
        });
      }}
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="accepted">Accepted</option>
      <option value="declined">Declined</option>
      <option value="closed">Closed</option>
    </Select>
  );
}
