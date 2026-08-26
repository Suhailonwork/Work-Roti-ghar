'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSupportSettings } from '@/lib/cms/queries';
import { supportPledgeSchema, toFormErrors, type FormState } from '@/lib/validation';

/**
 * Records an offer of support from the public form.
 *
 * This stores an *offer* — a name, a way to reach them, and what they can give.
 * It never takes card numbers, UPI PINs or banking credentials; if the
 * organisation ever enables public payments, the money must move through a
 * real payment gateway and only its transaction reference is stored here.
 */
export async function submitSupportPledgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = supportPledgeSchema.safeParse({
    name: formData.get('name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    kind: formData.get('kind') ?? 'in_kind',
    amount: formData.get('amount') || undefined,
    message: formData.get('message') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const support = await getSupportSettings();

  // Financial offers are only accepted when the organisation has deliberately
  // turned public payments on. By default it has not.
  if (parsed.data.kind === 'financial' && !support.public_payments_enabled) {
    return {
      ok: false,
      message:
        'We do not take donations from the public. Please choose one of the other ways to help — your time is worth more to us.',
      errors: { kind: ['Financial contributions from the public are not accepted.'] },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('support_pledges').insert({
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    kind: parsed.data.kind,
    amount: support.public_payments_enabled ? (parsed.data.amount ?? null) : null,
    message: parsed.data.message || null,
    status: 'new',
  });

  if (error) {
    return { ok: false, message: 'We could not record that just now. Please try again shortly.' };
  }

  revalidatePath('/admin/support');

  return {
    ok: true,
    message: 'Thank you. Someone from the team will be in touch — usually within a few days.',
  };
}
