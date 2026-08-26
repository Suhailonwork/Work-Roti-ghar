'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

type ActionResult = { ok: boolean; message?: string };

/** Marks one notification read. RLS scopes the update to the owner's rows. */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/notifications');
  revalidatePath('/dashboard');
  return { ok: true, message: 'All caught up.' };
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const supabase = await createClient();
  const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/notifications');
  return { ok: true };
}
