import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CommentModeration } from '@/components/admin/ModerationControls';
import { Avatar, Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, truncate } from '@/lib/utils';
import type { ContentStatus } from '@/types/database';

const PAGE_SIZE = 30;
const STATUSES: ContentStatus[] = ['published', 'hidden', 'removed'];
const STATUS_TONE = { published: 'green', hidden: 'amber', removed: 'red' } as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Comments', path: '/admin/comments', noIndex: true });
}

export default async function AdminCommentsPage({
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
    .from('comments')
    .select(
      'id, content, status, created_at, post_id, like_count, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)',
      { count: 'exact' },
    );

  if (status) query = query.eq('status', status);

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const tabs = [
    { label: 'All', href: '/admin/comments', count: count ?? 0 },
    { label: 'Published', href: '/admin/comments?status=published' },
    { label: 'Hidden', href: '/admin/comments?status=hidden' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading title="Comments" description="Moderate replies across the community feed." />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="No comments"
          description="Nothing to moderate."
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Comment</TH>
              <TH>Author</TH>
              <TH>Posted</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5} message="Nothing here." />
              ) : (
                rows.map((row) => {
                  const author = Array.isArray(row.author) ? row.author[0] : row.author;
                  const a = author as { id: string; full_name: string; avatar_url: string | null } | null;

                  return (
                    <TR key={row.id as string}>
                      <TD>
                        <Link
                          href={`/feed/${row.post_id as string}`}
                          className="block max-w-md text-clay-800 hover:underline"
                        >
                          {truncate(row.content as string, 120)}
                        </Link>
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
                      <TD className="whitespace-nowrap text-xs text-clay-600">
                        {formatDate(row.created_at as string)}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[row.status as ContentStatus]}>{row.status as string}</Badge>
                      </TD>
                      <TD align="right">
                        <CommentModeration commentId={row.id as string} status={row.status as ContentStatus} />
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
