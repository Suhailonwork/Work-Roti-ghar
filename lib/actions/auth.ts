'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, optionalFile, uploadFile } from '@/lib/storage';
import { absoluteUrl } from '@/lib/env';
import { safeRedirect } from '@/lib/utils';
import {
  forgotPasswordSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFormErrors,
  type FormState,
} from '@/lib/validation';

/**
 * Creates the account and the membership application in one step.
 *
 * The applicant has no session yet, so the auth user is created with the
 * service-role client. The database trigger `handle_new_user` then creates the
 * profile (status `pending`), the private contact row and the application
 * record. Passwords go straight to Supabase Auth, which stores them bcrypt-
 * hashed — nothing here ever sees or stores a plain-text password.
 */
export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const data = parsed.data;
  const avatar = optionalFile(formData, 'avatar');

  if (avatar && !IMAGE_TYPES.includes(avatar.type)) {
    return { ok: false, errors: { avatar: ['Choose a JPEG, PNG, WebP or AVIF image.'] } };
  }
  if (avatar && avatar.size > MAX_IMAGE_BYTES) {
    return { ok: false, errors: { avatar: ['That image is larger than 5 MB.'] } };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    // Membership is gated by admin approval, which is the real check here, so
    // the address is marked confirmed rather than sending a second email.
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
      mobile: data.mobile,
      address: data.address,
      reference: data.reference,
      referred_by_name: formData.get('referred_by_name')?.toString().trim() || '',
      reason: data.reason ?? '',
    },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? 'We could not create your account.';
    const alreadyRegistered = /already|exists|registered/i.test(message);
    return {
      ok: false,
      message: alreadyRegistered
        ? 'An account with that email already exists. Try signing in instead.'
        : message,
      errors: alreadyRegistered ? { email: ['That email is already registered.'] } : undefined,
    };
  }

  const userId = created.user.id;

  if (avatar) {
    try {
      const upload = await uploadFile(admin, {
        bucket: 'avatars',
        folder: userId,
        file: avatar,
        allowedTypes: IMAGE_TYPES,
        maxBytes: MAX_IMAGE_BYTES,
        isPublicBucket: true,
      });

      if (upload.publicUrl) {
        await admin.from('profiles').update({ avatar_url: upload.publicUrl }).eq('id', userId);
        await admin.from('member_applications').update({ avatar_url: upload.publicUrl }).eq('profile_id', userId);
      }
    } catch (error) {
      // A failed profile picture must not cost someone their application.
      console.error('[signup] avatar upload failed', error);
    }
  }

  // Sign the applicant in so they land on the "application received" screen.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (signInError) {
    redirect('/login?registered=1');
  }

  redirect('/pending');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague: never reveal whether an email is registered.
    return { ok: false, message: 'That email and password do not match an account.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = safeRedirect(formData.get('next')?.toString(), '/dashboard');

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.status !== 'active') destination = '/pending';
    else await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
  }

  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { ok: false, errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl('/auth/callback?next=/reset-password'),
  });

  // Always the same answer, whether or not the address exists.
  return {
    ok: true,
    message: 'If that email belongs to an account, a reset link is on its way.',
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { ok: false, errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'That reset link has expired. Request a new one.' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect('/dashboard');
}

/** Members editing their own profile. Role and status are not touchable here. */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const parsed = profileUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();
  const avatar = optionalFile(formData, 'avatar');
  let avatarUrl: string | undefined;

  if (avatar) {
    try {
      const upload = await uploadFile(supabase, {
        bucket: 'avatars',
        folder: user.id,
        file: avatar,
        allowedTypes: IMAGE_TYPES,
        maxBytes: MAX_IMAGE_BYTES,
        isPublicBucket: true,
      });
      avatarUrl = upload.publicUrl ?? undefined;
    } catch (error) {
      return { ok: false, errors: { avatar: [error instanceof Error ? error.message : 'Upload failed.'] } };
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      bio: parsed.data.bio || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq('id', user.id);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  // Contact details live in the private table, which only the owner and
  // administrators can read or write.
  const { error: contactError } = await supabase
    .from('profile_contacts')
    .update({
      mobile: parsed.data.mobile || null,
      address: parsed.data.address || null,
    })
    .eq('profile_id', user.id);

  if (contactError) {
    return { ok: false, message: contactError.message };
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');

  return { ok: true, message: 'Your profile has been updated.' };
}
