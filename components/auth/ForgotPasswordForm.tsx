'use client';

import { useActionState } from 'react';
import { forgotPasswordAction } from '@/lib/actions/auth';
import { FormField, Input } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from './FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      {!state.ok && (
        <FormField label="Email address" htmlFor="email" required errors={state.errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </FormField>
      )}

      {!state.ok && (
        <SubmitButton className="w-full" size="lg" pendingLabel="Sending…">
          Send reset link
        </SubmitButton>
      )}
    </form>
  );
}
