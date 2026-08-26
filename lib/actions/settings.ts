'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { toFormErrors, type FormState } from '@/lib/validation';
import type { Json } from '@/types/database';

const ADMIN = ['admin'] as const;

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

const orgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(400).optional().or(z.literal('')),
  instagram: z.string().trim().max(200).optional().or(z.literal('')),
  facebook: z.string().trim().max(200).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(200).optional().or(z.literal('')),
  youtube: z.string().trim().max(200).optional().or(z.literal('')),
});

export async function saveOrgSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = orgSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { instagram, facebook, whatsapp, youtube, ...org } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: 'org',
      value: { ...org, socials: { instagram, facebook, whatsapp, youtube } } as Json,
      is_public: true,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'settings.updated',
    entityType: 'site_settings',
    entityId: null,
    summary: 'Updated the organisation details',
  });

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Organisation details saved.' };
}

const seoDefaultsSchema = z.object({
  site_name: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(320).optional().or(z.literal('')),
  og_image: z.string().trim().max(500).optional().or(z.literal('')),
  twitter_site: z.string().trim().max(60).optional().or(z.literal('')),
});

export async function saveSeoDefaultsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = seoDefaultsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: 'seo_defaults',
      value: parsed.data as Json,
      is_public: true,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'settings.updated',
    entityType: 'site_settings',
    entityId: null,
    summary: 'Updated the default SEO settings',
  });

  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');
  return { ok: true, message: 'Default SEO settings saved.' };
}

const supportSchema = z.object({
  policy_statement: z.string().trim().min(10).max(600),
  public_payments_enabled: z.coerce.boolean().default(false),
  note: z.string().trim().max(600).optional().or(z.literal('')),
});

/**
 * Support / Sadaqah configuration.
 *
 * Public payment collection stays OFF unless an administrator deliberately
 * turns it on here — Roti Ghar's stated policy is that it does not take
 * donations from the public, and the software should reflect that by default
 * rather than quietly shipping a payment form.
 */
export async function saveSupportSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = supportSchema.safeParse({
    policy_statement: formData.get('policy_statement') ?? '',
    public_payments_enabled: formData.get('public_payments_enabled') === 'on',
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'support')
    .maybeSingle();

  const current = (existing?.value ?? {}) as Record<string, Json>;

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: 'support',
      value: {
        ...current,
        policy_statement: parsed.data.policy_statement,
        public_payments_enabled: parsed.data.public_payments_enabled,
        note: parsed.data.note || '',
      } as Json,
      is_public: true,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'settings.updated',
    entityType: 'site_settings',
    entityId: null,
    summary: `Set public payments to ${parsed.data.public_payments_enabled ? 'enabled' : 'disabled'}`,
    before: { public_payments_enabled: current.public_payments_enabled ?? false },
    after: { public_payments_enabled: parsed.data.public_payments_enabled },
  });

  revalidatePath('/support');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Support settings saved.' };
}

const pointsRulesSchema = z.object({
  distribution: z.coerce.number().int().min(0).max(1000),
  verified_contribution: z.coerce.number().int().min(0).max(1000),
  post: z.coerce.number().int().min(0).max(1000),
  volunteer_day: z.coerce.number().int().min(0).max(1000),
});

export async function savePointsRulesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = pointsRulesSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('site_settings').upsert(
    {
      key: 'points_rules',
      value: parsed.data as Json,
      is_public: false,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'settings.updated',
    entityType: 'site_settings',
    entityId: null,
    summary: 'Updated the points rules',
    after: parsed.data as Json,
  });

  revalidatePath('/admin/settings');
  return { ok: true, message: 'Points rules saved. New activity uses these values.' };
}

/** Marks a public support offer as handled. */
export async function updateSupportPledgeAction(id: string, status: string): Promise<{ ok: boolean; message?: string }> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const allowed = ['new', 'contacted', 'accepted', 'declined', 'closed'];
  if (!allowed.includes(status)) return { ok: false, message: 'Unknown status.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('support_pledges')
    .update({ status, handled_by: admin.id, handled_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/support');
  return { ok: true, message: `Marked ${status}.` };
}
