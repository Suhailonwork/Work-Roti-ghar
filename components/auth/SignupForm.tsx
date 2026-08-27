'use client';

import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { signUpAction } from '@/lib/actions/auth';
import { FormField, Input, Textarea } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { FormMessage } from './FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function SignupForm() {
  const { state, pending, formProps } = useFormAction(signUpAction, {
    resetOnSuccess: false,
    initialState,
  });
  const [preview, setPreview] = useState<string | null>(null);

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
  }

  return (
    <form {...formProps} className="space-y-5" noValidate>
      <FormMessage state={state} />

      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay-100 ring-1 ring-clay-200">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-7 w-7 text-clay-400" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <FormField
            label="Profile picture"
            htmlFor="avatar"
            help="Optional. JPEG, PNG, WebP or AVIF, up to 5 MB."
            errors={state.errors?.avatar}
          >
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onAvatarChange}
              className="block w-full text-sm text-clay-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cream-50 hover:file:bg-brand-800"
            />
          </FormField>
        </div>
      </div>

      <FormField label="Full name" htmlFor="full_name" required errors={state.errors?.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required placeholder="Your full name" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mobile number" htmlFor="mobile" required errors={state.errors?.mobile}>
          <Input id="mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="+91 98765 43210" />
        </FormField>

        <FormField label="Email address" htmlFor="email" required errors={state.errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="address" required errors={state.errors?.address}>
        <Textarea id="address" name="address" rows={2} required placeholder="Where you live" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="How did you hear about us?"
          htmlFor="reference"
          required
          errors={state.errors?.reference}
        >
          <Input id="reference" name="reference" required placeholder="Masjid, a friend, social media…" />
        </FormField>

        <FormField
          label="Referred by"
          htmlFor="referred_by_name"
          help="The member who told you about Roti Ghar, if any."
          errors={state.errors?.referred_by_name}
        >
          <Input id="referred_by_name" name="referred_by_name" placeholder="Their name" />
        </FormField>
      </div>

      <FormField
        label="Why do you want to join?"
        htmlFor="reason"
        help="Optional, but it helps the review."
        errors={state.errors?.reason}
      >
        <Textarea id="reason" name="reason" rows={3} placeholder="A sentence or two is plenty" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Password"
          htmlFor="password"
          required
          help="At least 8 characters, with upper and lower case letters and a number."
          errors={state.errors?.password}
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirm_password"
          required
          errors={state.errors?.confirm_password}
        >
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
          />
        </FormField>
      </div>

      <p className="rounded-xl border border-clay-200 bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-clay-600">
        Membership applications are reviewed by an administrator. Until yours is approved you will not be able
        to see the community feed, member list or any family records.
      </p>

      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Sending your application…">
        Submit application
      </SubmitButton>
    </form>
  );
}
