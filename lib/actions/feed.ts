'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertRole, getCurrentUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
  removeFile,
  uploadFile,
} from '@/lib/storage';
import { commentSchema, postSchema, reportSchema, toFormErrors, type FormState } from '@/lib/validation';
import { truncate } from '@/lib/utils';

const MEMBER_ROLES = ['admin', 'volunteer', 'member'] as const;
const MAX_MEDIA_PER_POST = 6;

type ActionResult = { ok: boolean; message?: string };

/** Notifies a member about something someone else did, never about their own action. */
async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    userId,
    actorId,
    type,
    title,
    body,
    link,
    entityType,
    entityId,
  }: {
    userId: string;
    actorId: string;
    type: 'like' | 'comment' | 'reply' | 'comment_like' | 'mention' | 'share';
    title: string;
    body?: string;
    link: string;
    entityType: string;
    entityId: string;
  },
) {
  if (userId === actorId) return;
  await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: actorId,
    type,
    title,
    body: body ?? null,
    link,
    entity_type: entityType,
    entity_id: entityId,
  });
}

/**
 * Records @mentions and notifies the people named.
 *
 * The ids come from the composer's member picker, and every one is re-checked
 * against the active member list here — the client's list is a convenience, not
 * a source of truth.
 */
async function saveMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    sourceType,
    sourceId,
    actorId,
    actorName,
    rawIds,
    link,
    excerpt,
  }: {
    sourceType: 'post' | 'comment';
    sourceId: string;
    actorId: string;
    actorName: string;
    rawIds: string[];
    link: string;
    excerpt: string;
  },
) {
  const unique = [...new Set(rawIds)].filter((id) => id && id !== actorId).slice(0, 20);
  if (!unique.length) return;

  const { data: valid } = await supabase
    .from('profiles')
    .select('id')
    .in('id', unique)
    .eq('status', 'active');

  const ids = (valid ?? []).map((row) => row.id);
  if (!ids.length) return;

  await supabase.from('mentions').upsert(
    ids.map((id) => ({
      source_type: sourceType,
      source_id: sourceId,
      mentioned_id: id,
      actor_id: actorId,
    })),
    { onConflict: 'source_type,source_id,mentioned_id', ignoreDuplicates: true },
  );

  for (const id of ids) {
    await notify(supabase, {
      userId: id,
      actorId,
      type: 'mention',
      title: `${actorName} mentioned you`,
      body: excerpt,
      link,
      entityType: sourceType,
      entityId: sourceId,
    });
  }
}

function mentionIds(formData: FormData): string[] {
  return formData
    .getAll('mention_ids')
    .flatMap((value) => value.toString().split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

// -------------------------------------------------------------------- posts --
export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await assertRole([...MEMBER_ROLES]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Not allowed.' };
  }

  const parsed = postSchema.safeParse({
    content: formData.get('content') ?? '',
    is_announcement: formData.get('is_announcement') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, errors: toFormErrors(parsed.error) };
  }

  const files = formData
    .getAll('media')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_MEDIA_PER_POST);

  if (!parsed.data.content.trim() && files.length === 0) {
    return { ok: false, message: 'Write something or attach a photo.' };
  }

  // Only administrators may post announcements; RLS enforces this too.
  const isAnnouncement = parsed.data.is_announcement && user.profile.role === 'admin';

  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: parsed.data.content.trim(),
      is_announcement: isAnnouncement,
    })
    .select('id')
    .single();

  if (error || !post) {
    return { ok: false, message: error?.message ?? 'Your post could not be saved.' };
  }

  const uploaded: { bucket: string; path: string }[] = [];

  for (const [index, file] of files.entries()) {
    const isVideo = VIDEO_TYPES.includes(file.type);
    try {
      const result = await uploadFile(supabase, {
        bucket: 'community',
        // Owner-scoped folder: storage RLS only lets a member write under their id.
        folder: `${user.id}/posts`,
        file,
        allowedTypes: isVideo ? VIDEO_TYPES : IMAGE_TYPES,
        maxBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
      });

      uploaded.push({ bucket: result.bucket, path: result.path });

      await supabase.from('post_media').insert({
        post_id: post.id,
        bucket: result.bucket,
        path: result.path,
        type: isVideo ? 'video' : 'image',
        position: index,
      });
    } catch (uploadError) {
      // Roll back so a half-uploaded post never appears in the feed.
      for (const item of uploaded) await removeFile(supabase, item.bucket, item.path);
      await supabase.from('posts').delete().eq('id', post.id);
      return {
        ok: false,
        message: uploadError instanceof Error ? uploadError.message : 'A file could not be uploaded.',
      };
    }
  }

  await saveMentions(supabase, {
    sourceType: 'post',
    sourceId: post.id,
    actorId: user.id,
    actorName: user.profile.full_name,
    rawIds: mentionIds(formData),
    link: `/feed/${post.id}`,
    excerpt: truncate(parsed.data.content, 120),
  });

  revalidatePath('/feed');
  revalidatePath('/dashboard');
  redirect(`/feed/${post.id}`);
}

export async function updatePostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'You need to sign in to do that.' };

  const postId = formData.get('post_id')?.toString();
  if (!postId) return { ok: false, message: 'Missing post.' };

  const parsed = postSchema.safeParse({ content: formData.get('content') ?? '' });
  if (!parsed.success) return { ok: false, errors: toFormErrors(parsed.error) };

  if (!parsed.data.content.trim()) {
    return { ok: false, message: 'A post cannot be emptied — delete it instead.' };
  }

  const supabase = await createClient();

  // RLS restricts this to the author (or an admin); the filter keeps the error
  // message honest when someone tries anyway.
  const { error } = await supabase
    .from('posts')
    .update({ content: parsed.data.content.trim(), edited_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);
  return { ok: true, message: 'Post updated.' };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const supabase = await createClient();

  const { data: post } = await supabase
    .from('posts')
    .select('id, author_id, content')
    .eq('id', postId)
    .maybeSingle();

  if (!post) return { ok: false, message: 'That post no longer exists.' };

  const isOwner = post.author_id === user.id;
  const isAdmin = user.profile.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, message: 'You cannot delete that post.' };

  // Clear the stored media before the rows cascade away.
  const { data: media } = await supabase.from('post_media').select('bucket, path').eq('post_id', postId);
  for (const item of media ?? []) await removeFile(supabase, item.bucket, item.path);

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) return { ok: false, message: error.message };

  if (isAdmin && !isOwner) {
    await recordAudit(supabase, {
      actorId: user.id,
      action: 'post.removed',
      entityType: 'post',
      entityId: postId,
      summary: `Removed a post by another member: "${truncate(post.content, 80)}"`,
    });
  }

  revalidatePath('/feed');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Post deleted.' };
}

// -------------------------------------------------------------------- likes --
export async function toggleLikeAction(postId: string): Promise<ActionResult & { liked?: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('likes').delete().eq('id', existing.id);
    if (error) return { ok: false, message: error.message };
    revalidatePath(`/feed/${postId}`);
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  if (error) return { ok: false, message: error.message };

  const { data: post } = await supabase.from('posts').select('author_id, content').eq('id', postId).maybeSingle();

  if (post) {
    await notify(supabase, {
      userId: post.author_id,
      actorId: user.id,
      type: 'like',
      title: `${user.profile.full_name} liked your post`,
      body: truncate(post.content, 100),
      link: `/feed/${postId}`,
      entityType: 'post',
      entityId: postId,
    });
  }

  revalidatePath(`/feed/${postId}`);
  return { ok: true, liked: true };
}

export async function toggleCommentLikeAction(commentId: string): Promise<ActionResult & { liked?: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id);
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
  if (error) return { ok: false, message: error.message };

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id, content, post_id')
    .eq('id', commentId)
    .maybeSingle();

  if (comment) {
    await notify(supabase, {
      userId: comment.author_id,
      actorId: user.id,
      type: 'comment_like',
      title: `${user.profile.full_name} liked your comment`,
      body: truncate(comment.content, 100),
      link: `/feed/${comment.post_id}`,
      entityType: 'comment',
      entityId: commentId,
    });
  }

  return { ok: true, liked: true };
}

// ----------------------------------------------------------------- comments --
export async function createCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to comment.' };
  }

  const parsed = commentSchema.safeParse({
    post_id: formData.get('post_id'),
    parent_id: formData.get('parent_id') ?? '',
    content: formData.get('content') ?? '',
  });

  if (!parsed.success) return { ok: false, errors: toFormErrors(parsed.error) };

  const supabase = await createClient();

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: parsed.data.post_id,
      author_id: user.id,
      parent_id: parsed.data.parent_id ?? null,
      content: parsed.data.content,
    })
    .select('id')
    .single();

  if (error || !comment) return { ok: false, message: error?.message ?? 'Your comment could not be saved.' };

  const link = `/feed/${parsed.data.post_id}`;

  if (parsed.data.parent_id) {
    const { data: parent } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', parsed.data.parent_id)
      .maybeSingle();

    if (parent) {
      await notify(supabase, {
        userId: parent.author_id,
        actorId: user.id,
        type: 'reply',
        title: `${user.profile.full_name} replied to your comment`,
        body: truncate(parsed.data.content, 100),
        link,
        entityType: 'comment',
        entityId: comment.id,
      });
    }
  } else {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', parsed.data.post_id)
      .maybeSingle();

    if (post) {
      await notify(supabase, {
        userId: post.author_id,
        actorId: user.id,
        type: 'comment',
        title: `${user.profile.full_name} commented on your post`,
        body: truncate(parsed.data.content, 100),
        link,
        entityType: 'post',
        entityId: parsed.data.post_id,
      });
    }
  }

  await saveMentions(supabase, {
    sourceType: 'comment',
    sourceId: comment.id,
    actorId: user.id,
    actorName: user.profile.full_name,
    rawIds: mentionIds(formData),
    link,
    excerpt: truncate(parsed.data.content, 120),
  });

  revalidatePath(link);
  return { ok: true, message: 'Comment posted.' };
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const supabase = await createClient();

  const { data: comment } = await supabase
    .from('comments')
    .select('id, author_id, post_id, content')
    .eq('id', commentId)
    .maybeSingle();

  if (!comment) return { ok: false, message: 'That comment no longer exists.' };

  const isOwner = comment.author_id === user.id;
  const isAdmin = user.profile.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, message: 'You cannot delete that comment.' };

  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) return { ok: false, message: error.message };

  if (isAdmin && !isOwner) {
    await recordAudit(supabase, {
      actorId: user.id,
      action: 'comment.removed',
      entityType: 'comment',
      entityId: commentId,
      summary: `Removed a comment: "${truncate(comment.content, 80)}"`,
    });
  }

  revalidatePath(`/feed/${comment.post_id}`);
  return { ok: true, message: 'Comment deleted.' };
}

// -------------------------------------------------------------------- share --
/** Shares an existing post into the feed, quoting the original. */
export async function sharePostAction(postId: string, note: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const supabase = await createClient();

  const { data: original } = await supabase
    .from('posts')
    .select('id, author_id, content, share_count')
    .eq('id', postId)
    .eq('status', 'published')
    .maybeSingle();

  if (!original) return { ok: false, message: 'That post is no longer available.' };

  const { data: shared, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: note.trim().slice(0, 2000),
      shared_from: original.id,
    })
    .select('id')
    .single();

  if (error || !shared) return { ok: false, message: error?.message ?? 'The post could not be shared.' };

  await supabase.from('posts').update({ share_count: original.share_count + 1 }).eq('id', original.id);

  await notify(supabase, {
    userId: original.author_id,
    actorId: user.id,
    type: 'share',
    title: `${user.profile.full_name} shared your post`,
    body: truncate(original.content, 100),
    link: `/feed/${shared.id}`,
    entityType: 'post',
    entityId: shared.id,
  });

  revalidatePath('/feed');
  return { ok: true, message: 'Shared with the community.' };
}

// ------------------------------------------------------------------ reports --
export async function reportContentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') {
    return { ok: false, message: 'You need an approved account to do that.' };
  }

  const parsed = reportSchema.safeParse({
    target_type: formData.get('target_type'),
    target_id: formData.get('target_id'),
    reason: formData.get('reason') ?? '',
    details: formData.get('details') ?? '',
  });

  if (!parsed.success) return { ok: false, errors: toFormErrors(parsed.error) };

  const supabase = await createClient();

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    // The unique constraint means one report per person per item.
    if (error.code === '23505') {
      return { ok: true, message: 'You have already reported this. An administrator will look at it.' };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Thank you — an administrator will review this.' };
}

// ------------------------------------------------------------ member search --
/** Powers the @mention picker. Returns public fields only. */
export async function searchMembersAction(
  query: string,
): Promise<{ id: string; full_name: string; avatar_url: string | null }[]> {
  const user = await getCurrentUser();
  if (!user || user.profile.status !== 'active') return [];

  const term = query.trim();
  if (term.length < 1) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('status', 'active')
    .ilike('full_name', `%${term}%`)
    .order('full_name')
    .limit(8);

  return data ?? [];
}
