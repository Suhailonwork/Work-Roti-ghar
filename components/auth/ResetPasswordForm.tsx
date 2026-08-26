'use client';

import { useActionState } from 'react';
import { resetPasswordAction } from '@/lib/actions/auth';
import { FormField, Input } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from './FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <FormField
        label="New password"
        htmlFor="password"
        required
        help="At least 8 characters, with upper and lower case letters and a number."
        errors={state.errors?.password}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>

      <FormField label="Confirm new password" htmlFor="confirm_password" required errors={state.errors?.confirm_password}>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </FormField>

      <SubmitButton className="w-full" size="lg" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
