import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { signedUrls } from '@/lib/storage';
import type { ContentStatus, MediaType } from '@/types/database';

export interface FeedAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

export interface FeedMedia {
  id: string;
  type: MediaType;
  url: string;
  position: number;
}

export interface FeedPost {
  id: string;
  content: string;
  status: ContentStatus;
  is_announcement: boolean;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  edited_at: string | null;
  author: FeedAuthor | null;
  media: FeedMedia[];
  liked_by_me: boolean;
  shared_post: {
    id: string;
    content: string;
    created_at: string;
    author: FeedAuthor | null;
  } | null;
  mentions: { id: string; full_name: string }[];
}

const POST_SELECT = `
  id, content, status, is_announcement, is_pinned, like_count, comment_count, share_count,
  created_at, edited_at, shared_from,
  author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
  media:post_media(id, bucket, path, type, position)
`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Loads posts and resolves everything the feed needs in a fixed number of
 * queries — media signing, the viewer's own likes, quoted posts and mentions —
 * rather than one round trip per card.
 */
async function hydrate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Record<string, unknown>[],
  viewerId: string,
): Promise<FeedPost[]> {
  if (!rows.length) return [];

  const postIds = rows.map((row) => row.id as string);

  // Post media lives in a private bucket; hand out short-lived signed URLs.
  const mediaPaths = rows.flatMap((row) =>
    ((row.media ?? []) as { path: string }[]).map((m) => m.path),
  );
  const urlMap = await signedUrls(supabase, 'community', mediaPaths, 60 * 30);

  const sharedIds = rows.map((row) => row.shared_from as string | null).filter((id): id is string => Boolean(id));

  const [likesResult, sharedResult, mentionsResult] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
    sharedIds.length
      ? supabase
          .from('posts')
          .select('id, content, created_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role)')
          .in('id', sharedIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase
      .from('mentions')
      .select('source_id, profile:profiles!mentions_mentioned_id_fkey(id, full_name)')
      .eq('source_type', 'post')
      .in('source_id', postIds),
  ]);

  const likedIds = new Set((likesResult.data ?? []).map((row) => row.post_id));

  const sharedMap = new Map<string, FeedPost['shared_post']>();
  for (const row of (sharedResult.data ?? []) as Record<string, unknown>[]) {
    sharedMap.set(row.id as string, {
      id: row.id as string,
      content: row.content as string,
      created_at: row.created_at as string,
      author: one(row.author as FeedAuthor | FeedAuthor[]),
    });
  }

  const mentionMap = new Map<string, { id: string; full_name: string }[]>();
  for (const row of (mentionsResult.data ?? []) as Record<string, unknown>[]) {
    const profile = one(row.profile as { id: string; full_name: string } | { id: string; full_name: string }[]);
    if (!profile) continue;
    const key = row.source_id as string;
    mentionMap.set(key, [...(mentionMap.get(key) ?? []), profile]);
  }

  return rows.map((row) => {
    const media = ((row.media ?? []) as { id: string; path: string; type: MediaType; position: number }[])
      .map((m) => ({ id: m.id, type: m.type, url: urlMap[m.path] ?? '', position: m.position }))
      .filter((m) => m.url)
      .sort((a, b) => a.position - b.position);

    return {
      id: row.id as string,
      content: row.content as string,
      status: row.status as ContentStatus,
      is_announcement: row.is_announcement as boolean,
      is_pinned: row.is_pinned as boolean,
      like_count: row.like_count as number,
      comment_count: row.comment_count as number,
      share_count: row.share_count as number,
      created_at: row.created_at as string,
      edited_at: (row.edited_at as string) ?? null,
      author: one(row.author as FeedAuthor | FeedAuthor[]),
      media,
      liked_by_me: likedIds.has(row.id as string),
      shared_post: row.shared_from ? (sharedMap.get(row.shared_from as string) ?? null) : null,
      mentions: mentionMap.get(row.id as string) ?? [],
    };
  });
}

export async function getFeedPosts({
  viewerId,
  page = 1,
  pageSize = 10,
  authorId,
}: {
  viewerId: string;
  page?: number;
  pageSize?: number;
  authorId?: string;
}): Promise<{ posts: FeedPost[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('posts')
    .select(POST_SELECT, { count: 'exact' })
    .eq('status', 'published');

  if (authorId) query = query.eq('author_id', authorId);

  const { data, count } = await query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  const posts = await hydrate(supabase, (data ?? []) as unknown as Record<string, unknown>[], viewerId);
  return { posts, total: count ?? 0 };
}

export async function getPost(postId: string, viewerId: string): Promise<FeedPost | null> {
  const supabase = await createClient();

  const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).maybeSingle();
  if (!data) return null;

  const [post] = await hydrate(supabase, [data as unknown as Record<string, unknown>], viewerId);
  return post ?? null;
}

export interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  like_count: number;
  parent_id: string | null;
  author: FeedAuthor | null;
  liked_by_me: boolean;
  replies: FeedComment[];
}

/** Comments for a post, nested one level deep (comment → replies). */
export async function getComments(postId: string, viewerId: string): Promise<FeedComment[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('comments')
    .select(
      'id, content, created_at, edited_at, like_count, parent_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)',
    )
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (!rows.length) return [];

  const { data: likes } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', viewerId)
    .in(
      'comment_id',
      rows.map((row) => row.id as string),
    );

  const likedIds = new Set((likes ?? []).map((row) => row.comment_id));

  const build = (row: Record<string, unknown>): FeedComment => ({
    id: row.id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    edited_at: (row.edited_at as string) ?? null,
    like_count: row.like_count as number,
    parent_id: (row.parent_id as string) ?? null,
    author: one(row.author as FeedAuthor | FeedAuthor[]),
    liked_by_me: likedIds.has(row.id as string),
    replies: [],
  });

  const byId = new Map<string, FeedComment>();
  const roots: FeedComment[] = [];

  for (const row of rows) byId.set(row.id as string, build(row));

  for (const comment of byId.values()) {
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return roots;
}
