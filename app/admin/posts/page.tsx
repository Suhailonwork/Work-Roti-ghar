import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PostModeration } from '@/components/admin/ModerationControls';
import { Avatar, Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, truncate } from '@/lib/utils';
import type { ContentStatus } from '@/types/database';

const PAGE_SIZE = 25;
const STATUSES: ContentStatus[] = ['published', 'hidden', 'removed'];
const STATUS_TONE = { published: 'green', hidden: 'amber', removed: 'red' } as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Posts', path: '/admin/posts', noIndex: true });
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as ContentStatus)
    ? (params.status as ContentStatus)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select(
      'id, content, status, is_pinned, is_announcement, like_count, comment_count, created_at, removed_reason, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)',
      { count: 'exact' },
    );

  if (status) query = query.eq('status', status);

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const tabs = [
    { label: 'All', href: '/admin/posts', count: count ?? 0 },
    { label: 'Published', href: '/admin/posts?status=published' },
    { label: 'Hidden', href: '/admin/posts?status=hidden' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Posts"
        description="Hide anything that shouldn't be in the feed. Hidden posts are kept so the decision can be reversed."
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No posts" description="Nothing to moderate." />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Post</TH>
              <TH>Author</TH>
              <TH align="center">Engagement</TH>
              <TH>Posted</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6} message="Nothing here." />
              ) : (
                rows.map((row) => {
                  const author = Array.isArray(row.author) ? row.author[0] : row.author;
                  const a = author as { id: string; full_name: string; avatar_url: string | null } | null;

                  return (
                    <TR key={row.id as string}>
                      <TD>
                        <Link href={`/feed/${row.id as string}`} className="block max-w-md hover:underline">
                          <span className="text-clay-800">
                            {truncate(row.content as string, 110) || <em className="text-clay-400">Media only</em>}
                          </span>
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {Boolean(row.is_pinned) && <Badge tone="amber">Pinned</Badge>}
                          {Boolean(row.is_announcement) && <Badge tone="purple">Announcement</Badge>}
                        </div>
                        {Boolean(row.removed_reason) && (
                          <p className="mt-1 text-xs text-red-700">Hidden: {row.removed_reason as string}</p>
                        )}
                      </TD>
                      <TD>
                        {a ? (
                          <Link href={`/members/${a.id}`} className="flex items-center gap-2 hover:underline">
                            <Avatar src={a.avatar_url} name={a.full_name} size={28} />
                            <span className="truncate text-sm">{a.full_name}</span>
                          </Link>
                        ) : (
                          <span className="text-clay-400">—</span>
                        )}
                      </TD>
                      <TD align="center" className="whitespace-nowrap text-xs text-clay-600">
                        {row.like_count as number} likes · {row.comment_count as number} comments
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-clay-600">
                        {formatDate(row.created_at as string)}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[row.status as ContentStatus]}>{row.status as string}</Badge>
                      </TD>
                      <TD align="right">
                        <PostModeration
                          postId={row.id as string}
                          status={row.status as ContentStatus}
                          isPinned={row.is_pinned as boolean}
                        />
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </TableWrap>

          <Suspense fallback={null}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
          </Suspense>
        </>
      )}
    </div>
  );
}
