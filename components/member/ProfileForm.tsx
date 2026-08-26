'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { updateProfileAction } from '@/lib/actions/auth';
import { Avatar, FormField, Input, Textarea } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/auth/FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

export function ProfileForm({
  profile,
  contact,
}: {
  profile: { full_name: string; bio: string | null; avatar_url: string | null };
  contact: { mobile: string | null; address: string | null };
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-1 ring-clay-200"
          />
        ) : (
          <Avatar src={profile.avatar_url} name={profile.full_name} size={80} />
        )}

        <div className="min-w-0 flex-1">
          <FormField
            label="Profile picture"
            htmlFor="avatar"
            help="JPEG, PNG, WebP or AVIF, up to 5 MB."
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
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} required autoComplete="name" />
      </FormField>

      <FormField
        label="About you"
        htmlFor="bio"
        help="Shown on your profile to other members."
        errors={state.errors?.bio}
      >
        <Textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ''} maxLength={500} />
      </FormField>

      <div className="rounded-xl border border-clay-200 bg-cream-100 p-4">
        <h3 className="text-sm font-semibold text-clay-900">Contact details</h3>
        <p className="mt-1 mb-4 text-xs leading-relaxed text-clay-600">
          Only you and administrators can see these. They are never shown to other members.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mobile number" htmlFor="mobile" errors={state.errors?.mobile}>
            <Input id="mobile" name="mobile" type="tel" defaultValue={contact.mobile ?? ''} autoComplete="tel" />
          </FormField>

          <FormField label="Address" htmlFor="address" errors={state.errors?.address}>
            <Input id="address" name="address" defaultValue={contact.address ?? ''} autoComplete="street-address" />
          </FormField>
        </div>
      </div>

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
