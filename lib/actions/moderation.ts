'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { truncate } from '@/lib/utils';
import type { ContentStatus, ReportStatus } from '@/types/database';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

function failure(error: unknown): ActionResult {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

/**
 * Hides or restores a post without deleting it.
 *
 * Hidden posts stay in the database so a moderation decision can be reviewed or
 * reversed — the RLS policy stops members seeing anything that is not
 * `published`.
 */
export async function setPostStatusAction(
  postId: string,
  status: ContentStatus,
  reason?: string,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('posts')
    .select('id, content, status, author_id')
    .eq('id', postId)
    .maybeSingle();

  if (!before) return { ok: false, message: 'That post no longer exists.' };

  const { error } = await supabase
    .from('posts')
    .update({
      status,
      removed_reason: status === 'published' ? null : (reason ?? null),
      removed_by: status === 'published' ? null : admin.id,
    })
    .eq('id', postId);

  if (error) return { ok: false, message: error.message };

  if (status !== 'published' && before.author_id !== admin.id) {
    await supabase.from('notifications').insert({
      user_id: before.author_id,
      actor_id: admin.id,
      type: 'system',
      title: 'A post of yours was hidden',
      body: reason || 'An administrator hid one of your posts from the community feed.',
      link: '/feed',
      entity_type: 'post',
      entity_id: postId,
    });
  }

  await recordAudit(supabase, {
    actorId: admin.id,
    action: status === 'published' ? 'post.restored' : 'post.removed',
    entityType: 'post',
    entityId: postId,
    summary: `${status === 'published' ? 'Restored' : 'Hid'} a post: "${truncate(before.content, 80)}"${
      reason ? ` — ${reason}` : ''
    }`,
    before: { status: before.status },
    after: { status },
  });

  revalidatePath('/admin/posts');
  revalidatePath('/feed');
  return { ok: true, message: status === 'published' ? 'Post restored.' : 'Post hidden.' };
}

export async function setCommentStatusAction(commentId: string, status: ContentStatus): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('comments')
    .select('id, content, status, post_id')
    .eq('id', commentId)
    .maybeSingle();

  if (!before) return { ok: false, message: 'That comment no longer exists.' };

  const { error } = await supabase
    .from('comments')
    .update({ status, removed_by: status === 'published' ? null : admin.id })
    .eq('id', commentId);

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'comment.removed',
    entityType: 'comment',
    entityId: commentId,
    summary: `${status === 'published' ? 'Restored' : 'Hid'} a comment: "${truncate(before.content, 80)}"`,
    before: { status: before.status },
    after: { status },
  });

  revalidatePath('/admin/comments');
  revalidatePath(`/feed/${before.post_id}`);
  return { ok: true, message: status === 'published' ? 'Comment restored.' : 'Comment hidden.' };
}

export async function pinPostAction(postId: string, pinned: boolean): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('posts').update({ is_pinned: pinned }).eq('id', postId);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/posts');
  revalidatePath('/feed');
  return { ok: true, message: pinned ? 'Post pinned to the top of the feed.' : 'Post unpinned.' };
}

/** Closes a report, optionally acting on the content it refers to. */
export async function resolveReportAction(
  reportId: string,
  status: ReportStatus,
  notes?: string,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const supabase = await createClient();
  const { data: report } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason')
    .eq('id', reportId)
    .maybeSingle();

  if (!report) return { ok: false, message: 'That report no longer exists.' };

  const closing = status === 'resolved' || status === 'dismissed';

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolution_notes: notes || null,
      resolved_by: closing ? admin.id : null,
      resolved_at: closing ? new Date().toISOString() : null,
    })
    .eq('id', reportId);

  if (error) return { ok: false, message: error.message };

  if (closing) {
    await supabase.from('notifications').insert({
      user_id: report.reporter_id,
      actor_id: admin.id,
      type: 'report_update',
      title: status === 'resolved' ? 'Your report was acted on' : 'Your report was reviewed',
      body: notes || 'Thank you for flagging it.',
      link: '/feed',
      entity_type: 'report',
      entity_id: reportId,
    });
  }

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'report.resolved',
    entityType: 'report',
    entityId: reportId,
    summary: `Marked a ${report.target_type} report as ${status} (${report.reason})`,
    after: { status, notes: notes ?? null },
  });

  revalidatePath('/admin/reports');
  return { ok: true, message: `Report marked ${status}.` };
}
