'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Modal } from '@/components/ui/Modal';
import { FormMessage } from '@/components/auth/FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export interface FieldErrors {
  errors?: Record<string, string[]>;
}

/**
 * A create/edit dialog around a server action.
 *
 * The children are a render function so each screen supplies its own fields
 * while the open/close, pending, error and refresh behaviour lives here once.
 */
export function FormModal({
  action,
  title,
  description,
  trigger,
  triggerVariant = 'primary',
  submitLabel = 'Save',
  size = 'md',
  children,
  openOnMount = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  title: string;
  description?: string;
  trigger: ReactNode;
  triggerVariant?: ButtonVariant;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: (state: FormState) => ReactNode;
  openOnMount?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnMount);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? 'Saved.');
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" variant={triggerVariant} size="sm" onClick={() => setOpen(true)}>
        {trigger}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />
          {children(state)}

          <div className="flex justify-end gap-2 border-t border-clay-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Convenience trigger content for "add a thing" buttons. */
export function AddTrigger({ label }: { label: string }) {
  return (
    <>
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </>
  );
}
