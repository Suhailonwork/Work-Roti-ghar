'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/** Destructive action behind a confirmation dialog, with a page refresh after. */
export function DeleteButton({
  action,
  title,
  description,
  confirmLabel = 'Delete',
  icon,
  label,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>;
  title: string;
  description?: string;
  confirmLabel?: string;
  icon?: ReactNode;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
        aria-label={label ?? confirmLabel}
      >
        {icon ?? <Trash2 className="h-3.5 w-3.5" aria-hidden />}
        {label && <span>{label}</span>}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await action();
                  if (result.ok) {
                    toast.success(result.message ?? 'Deleted.');
                    setOpen(false);
                    router.refresh();
                  } else {
                    toast.error(result.message ?? 'That did not work.');
                  }
                })
              }
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </>
  );
}
