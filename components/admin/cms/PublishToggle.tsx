'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, GlobeLock } from 'lucide-react';
import { toast } from 'sonner';
import { togglePublishAction } from '@/lib/actions/cms';
import { Button } from '@/components/ui/Button';

/** Publish / unpublish a page straight from the list. */
export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      loading={pending}
      className={published ? 'text-clay-600' : 'text-brand-700 hover:bg-brand-50'}
      onClick={() =>
        startTransition(async () => {
          const result = await togglePublishAction(id, !published);
          if (result.ok) {
            toast.success(result.message ?? 'Done');
            router.refresh();
          } else {
            toast.error(result.message ?? 'That did not work.');
          }
        })
      }
    >
      {published ? (
        <>
          <GlobeLock className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Unpublish</span>
        </>
      ) : (
        <>
          <Globe className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Publish</span>
        </>
      )}
    </Button>
  );
}
