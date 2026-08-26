'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, type ButtonVariant } from './Button';
import { Modal } from './Modal';

/**
 * A destructive action behind a confirmation dialog. Wraps a server action so
 * nothing irreversible happens on a single stray click.
 */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  size = 'sm',
  className,
  children,
  successMessage,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  children: ReactNode;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          toast.success(successMessage ?? result.message ?? 'Done');
          setOpen(false);
        } else {
          toast.error(result.message ?? 'That did not work.');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'That did not work.');
      }
    });
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button type="button" variant={variant} onClick={confirm} loading={pending}>
              {confirmLabel}
            </Button>
          </>
        }
      />
    </>
  );
}
