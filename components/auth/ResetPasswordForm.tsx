'use client';

import { resetPasswordAction } from '@/lib/actions/auth';
import { FormField, Input } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { FormMessage } from './FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function ResetPasswordForm() {
  const { state, pending, formProps } = useFormAction(resetPasswordAction, {
    resetOnSuccess: false,
    initialState,
  });

  return (
    <form {...formProps} className="space-y-4" noValidate>
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

      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
