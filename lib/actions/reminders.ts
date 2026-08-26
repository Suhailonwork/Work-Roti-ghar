'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertRole, getCurrentUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { reminderSchema, toFormErrors, type FormState } from '@/lib/validation';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

/**
 * Creates a reminder and, unless it is saved as a draft, sends it.
 *
 * Fan-out happens in `dispatch_reminder()` — a SECURITY DEFINER function — so
 * one call materialises the recipient list for the chosen audience and writes
 * every notification, without granting admins blanket insert rights on other
 * members' notification rows.
 */
export async function saveReminderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = reminderSchema.safeParse({
    id: formData.get('id') || undefined,
    title: formData.get('title') ?? '',
    body: formData.get('body') ?? '',
    audience: formData.get('audience') ?? 'all',
    priority: formData.get('priority') ?? 'normal',
    due_at: formData.get('due_at') ?? '',
    profile_ids: formData.getAll('profile_ids').map((v) => v.toString()).filter(Boolean),
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { id, profile_ids, ...values } = parsed.data;

  if (values.audience === 'selected' && profile_ids.length === 0) {
    return { ok: false, errors: { profile_ids: ['Choose at least one member.'] } };
  }

  const sendNow = formData.get('send_now') === 'on';
  const supabase = await createClient();

  const payload = {
    title: values.title,
    body: values.body || null,
    audience: values.audience,
    priority: values.priority,
    due_at: values.due_at ? new Date(values.due_at).toISOString() : null,
  };

  let reminderId = id;

  if (reminderId) {
    const { error } = await supabase.from('reminders').update(payload).eq('id', reminderId);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data, error } = await supabase
      .from('reminders')
      .insert({ ...payload, status: 'draft', created_by: user.id })
      .select('id')
      .single();

    if (error || !data) return { ok: false, message: error?.message ?? 'The reminder could not be saved.' };
    reminderId = data.id;
  }

  if (sendNow) {
    const { error: dispatchError } = await supabase.rpc('dispatch_reminder', {
      p_reminder_id: reminderId!,
      p_profile_ids: values.audience === 'selected' ? profile_ids : null,
    });

    if (dispatchError) {
      return { ok: false, message: `Saved, but sending failed: ${dispatchError.message}` };
    }

    await recordAudit(supabase, {
      actorId: user.id,
      action: 'reminder.sent',
      entityType: 'reminder',
      entityId: reminderId!,
      summary: `Sent "${values.title}" to ${values.audience}`,
    });
  }

  revalidatePath('/admin/reminders');
  revalidatePath('/reminders');

  return {
    ok: true,
    message: sendNow ? 'Reminder sent.' : 'Reminder saved as a draft.',
  };
}

export async function sendReminderAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();

  const { data: reminder } = await supabase
    .from('reminders')
    .select('title, audience')
    .eq('id', id)
    .maybeSingle();

  if (!reminder) return { ok: false, message: 'That reminder no longer exists.' };

  if (reminder.audience === 'selected') {
    return {
      ok: false,
      message: 'This reminder targets specific members. Open it and choose them before sending.',
    };
  }

  const { error } = await supabase.rpc('dispatch_reminder', { p_reminder_id: id, p_profile_ids: null });
  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: user.id,
    action: 'reminder.sent',
    entityType: 'reminder',
    entityId: id,
    summary: `Sent "${reminder.title}" to ${reminder.audience}`,
  });

  revalidatePath('/admin/reminders');
  revalidatePath('/reminders');
  return { ok: true, message: 'Reminder sent.' };
}

export async function deleteReminderAction(id: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/reminders');
  revalidatePath('/reminders');
  return { ok: true, message: 'Reminder deleted.' };
}

/** A member acknowledging a reminder. */
export async function markReminderReadAction(recipientId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const supabase = await createClient();

  // RLS restricts the update to the member's own recipient row.
  const { error } = await supabase
    .from('reminder_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', recipientId)
    .eq('profile_id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/reminders');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Marked as read.' };
}
