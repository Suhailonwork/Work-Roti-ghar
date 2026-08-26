'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction } from '@/lib/actions/auth';
import { FormField, Input } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from './FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function LoginForm({ next, registered }: { next?: string; registered?: boolean }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {registered && !state.message && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Your application has been received. Sign in to check its progress.
        </div>
      )}

      <FormMessage state={state} />

      {next && <input type="hidden" name="next" value={next} />}

      <FormField label="Email address" htmlFor="email" required errors={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </FormField>

      <FormField label="Password" htmlFor="password" required errors={state.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
          Forgot your password?
        </Link>
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
