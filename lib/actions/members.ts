'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import {
  applicationReviewSchema,
  memberOfMonthSchema,
  memberRoleSchema,
  memberStatusSchema,
  pointsSchema,
  toFormErrors,
  type FormState,
} from '@/lib/validation';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

/**
 * Approves or rejects a membership application.
 *
 * Approval flips the profile to `active`, sets the role, stamps the join date
 * and notifies the applicant. Every decision is written to the audit log — this
 * is one of the changes the brief specifically requires to be traceable.
 */
export async function reviewApplicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = applicationReviewSchema.safeParse({
    application_id: formData.get('application_id'),
    decision: formData.get('decision'),
    role: formData.get('role') || 'member',
    review_notes: formData.get('review_notes') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { application_id, decision, role, review_notes } = parsed.data;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from('member_applications')
    .select('id, profile_id, full_name, status')
    .eq('id', application_id)
    .maybeSingle();

  if (!application) return { ok: false, message: 'That application no longer exists.' };
  if (application.status !== 'pending') {
    return { ok: false, message: 'This application has already been reviewed.' };
  }

  const now = new Date().toISOString();
  const approved = decision === 'approved';

  const { error: applicationError } = await supabase
    .from('member_applications')
    .update({
      status: decision,
      review_notes: review_notes || null,
      reviewed_by: admin.id,
      reviewed_at: now,
    })
    .eq('id', application_id);

  if (applicationError) return { ok: false, message: applicationError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      status: approved ? 'active' : 'rejected',
      role: approved ? role : 'member',
      joined_at: approved ? now : null,
      approved_at: approved ? now : null,
      approved_by: admin.id,
    })
    .eq('id', application.profile_id);

  if (profileError) return { ok: false, message: profileError.message };

  await supabase.from('notifications').insert({
    user_id: application.profile_id,
    actor_id: admin.id,
    type: approved ? 'approval' : 'rejection',
    title: approved ? 'Your membership was approved' : 'Your application was not approved',
    body: approved
      ? 'Welcome to Roti Ghar. You now have access to the community feed and the members area.'
      : review_notes || 'Get in touch if you would like us to take another look.',
    link: approved ? '/dashboard' : '/pending',
    entity_type: 'member_application',
    entity_id: application_id,
  });

  await recordAudit(supabase, {
    actorId: admin.id,
    action: approved ? 'member.approved' : 'member.rejected',
    entityType: 'profile',
    entityId: application.profile_id,
    summary: approved
      ? `Approved ${application.full_name} as ${role}`
      : `Rejected the application from ${application.full_name}`,
    after: { status: approved ? 'active' : 'rejected', role: approved ? role : 'member' },
  });

  revalidatePath('/admin/applications');
  revalidatePath('/admin/members');
  revalidatePath('/admin');

  return { ok: true, message: approved ? `${application.full_name} approved.` : 'Application rejected.' };
}

export async function changeMemberStatusAction(
  profileId: string,
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'inactive',
  reason?: string,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = memberStatusSchema.safeParse({ profile_id: profileId, status, reason: reason ?? '' });
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  if (profileId === admin.id) {
    return { ok: false, message: 'You cannot change your own status.' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('profiles')
    .select('full_name, status')
    .eq('id', profileId)
    .maybeSingle();

  if (!before) return { ok: false, message: 'That member no longer exists.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      status: parsed.data.status,
      ...(parsed.data.status === 'active' && !before.status.includes('active')
        ? { joined_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', profileId);

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'member.status_changed',
    entityType: 'profile',
    entityId: profileId,
    summary: `Changed ${before.full_name} from ${before.status} to ${parsed.data.status}${
      parsed.data.reason ? ` — ${parsed.data.reason}` : ''
    }`,
    before: { status: before.status },
    after: { status: parsed.data.status },
  });

  revalidatePath('/admin/members');
  revalidatePath('/members');
  return { ok: true, message: `${before.full_name} is now ${parsed.data.status}.` };
}

export async function changeMemberRoleAction(
  profileId: string,
  role: 'member' | 'volunteer' | 'admin',
): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = memberRoleSchema.safeParse({ profile_id: profileId, role });
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  if (profileId === admin.id) {
    // Guards against an administrator locking themselves out of /admin.
    return { ok: false, message: 'You cannot change your own role. Ask another administrator.' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', profileId)
    .maybeSingle();

  if (!before) return { ok: false, message: 'That member no longer exists.' };

  const { error } = await supabase.from('profiles').update({ role: parsed.data.role }).eq('id', profileId);
  if (error) return { ok: false, message: error.message };

  await supabase.from('notifications').insert({
    user_id: profileId,
    actor_id: admin.id,
    type: 'system',
    title: 'Your role has changed',
    body: `You are now recorded as a ${parsed.data.role}.`,
    link: '/profile',
    entity_type: 'profile',
    entity_id: profileId,
  });

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'member.role_changed',
    entityType: 'profile',
    entityId: profileId,
    summary: `Changed ${before.full_name} from ${before.role} to ${parsed.data.role}`,
    before: { role: before.role },
    after: { role: parsed.data.role },
  });

  revalidatePath('/admin/members');
  return { ok: true, message: `${before.full_name} is now a ${parsed.data.role}.` };
}

/** Manual points adjustment. Positive to award, negative to deduct. */
export async function adjustPointsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = pointsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('point_transactions').insert({
    profile_id: parsed.data.profile_id,
    points: parsed.data.points,
    category: parsed.data.points < 0 ? 'penalty' : parsed.data.category,
    reason: parsed.data.reason,
    is_verified: true,
    awarded_by: admin.id,
  });

  if (error) return { ok: false, message: error.message };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', parsed.data.profile_id)
    .maybeSingle();

  await supabase.from('notifications').insert({
    user_id: parsed.data.profile_id,
    actor_id: admin.id,
    type: 'points',
    title: parsed.data.points >= 0 ? `You were awarded ${parsed.data.points} points` : 'Your points were adjusted',
    body: parsed.data.reason,
    link: '/profile',
    entity_type: 'profile',
    entity_id: parsed.data.profile_id,
  });

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'points.adjusted',
    entityType: 'profile',
    entityId: parsed.data.profile_id,
    summary: `${parsed.data.points >= 0 ? 'Awarded' : 'Deducted'} ${Math.abs(parsed.data.points)} points ${
      parsed.data.points >= 0 ? 'to' : 'from'
    } ${profile?.full_name ?? 'a member'} — ${parsed.data.reason}`,
    after: { points: parsed.data.points, reason: parsed.data.reason },
  });

  revalidatePath('/admin/top-members');
  revalidatePath('/members/top');
  return { ok: true, message: 'Points updated.' };
}

export async function removePointTransactionAction(id: string): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('point_transactions').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('point_transactions').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'points.adjusted',
    entityType: 'point_transaction',
    entityId: id,
    summary: `Removed a points entry of ${before?.points ?? 0} (${before?.reason ?? 'no reason recorded'})`,
    before: before ?? null,
  });

  revalidatePath('/admin/top-members');
  revalidatePath('/members/top');
  return { ok: true, message: 'Points entry removed.' };
}

/** Selects the member of the month. One per calendar month. */
export async function setMemberOfMonthAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = memberOfMonthSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('member_of_month').upsert(
    {
      profile_id: parsed.data.profile_id,
      year: parsed.data.year,
      month: parsed.data.month,
      citation: parsed.data.citation || null,
      selected_by: admin.id,
    },
    { onConflict: 'year,month' },
  );

  if (error) return { ok: false, message: error.message };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', parsed.data.profile_id)
    .maybeSingle();

  await supabase.from('notifications').insert({
    user_id: parsed.data.profile_id,
    actor_id: admin.id,
    type: 'announcement',
    title: 'You are member of the month',
    body: parsed.data.citation || 'Thank you for everything you have done this month.',
    link: '/members/top',
    entity_type: 'member_of_month',
    entity_id: parsed.data.profile_id,
  });

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'member_of_month.selected',
    entityType: 'profile',
    entityId: parsed.data.profile_id,
    summary: `Selected ${profile?.full_name ?? 'a member'} for ${parsed.data.month}/${parsed.data.year}`,
  });

  revalidatePath('/admin/top-members');
  revalidatePath('/members/top');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Member of the month selected.' };
}
