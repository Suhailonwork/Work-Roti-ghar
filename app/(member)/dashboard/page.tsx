import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Award,
  Bell,
  MessageSquare,
  Package,
  PenSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getImpactStats } from '@/lib/cms/queries';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  StatCard,
} from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, formatNumber, timeAgo, truncate } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Dashboard', path: '/dashboard', noIndex: true });
}

const PRIORITY_TONE = { urgent: 'red', high: 'amber', normal: 'green', low: 'neutral' } as const;

export default async function DashboardPage() {
  const user = await requireApproved();
  const supabase = await createClient();

  const [stats, postsResult, remindersResult, pointsResult, memberOfMonthResult] = await Promise.all([
    getImpactStats(),
    supabase
      .from('posts')
      .select(
        'id, content, created_at, like_count, comment_count, is_announcement, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)',
      )
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('reminder_recipients')
      .select('id, is_read, reminder:reminders(id, title, body, due_at, priority)')
      .eq('profile_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('point_transactions')
      .select('id, points, reason, occurred_at, category')
      .eq('profile_id', user.id)
      .eq('is_verified', true)
      .order('occurred_at', { ascending: false })
      .limit(5),
    supabase
      .from('member_of_month')
      .select('citation, year, month, profile:profiles!member_of_month_profile_id_fkey(id, full_name, avatar_url)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const posts = postsResult.data ?? [];
  const reminders = remindersResult.data ?? [];
  const pointsLedger = pointsResult.data ?? [];
  const memberOfMonth = memberOfMonthResult.data;
  const honouree = memberOfMonth
    ? ((Array.isArray(memberOfMonth.profile) ? memberOfMonth.profile[0] : memberOfMonth.profile) as
        | { id: string; full_name: string; avatar_url: string | null }
        | undefined)
    : undefined;

  const firstName = user.profile.full_name.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">
            Assalamu alaikum, {firstName}
          </h1>
          <p className="mt-1 text-sm text-clay-600">
            Member since {formatDate(user.profile.joined_at ?? user.profile.created_at)}
          </p>
        </div>
        <ButtonLink href="/feed/new" size="sm">
          <PenSquare className="h-4 w-4" aria-hidden />
          Write a post
        </ButtonLink>
      </div>

      {/* ---------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Your points"
          value={formatNumber(user.profile.points)}
          hint="From verified activity"
          icon={<Award className="h-4 w-4" />}
          tone="green"
          href="/members/top"
        />
        <StatCard
          label="Your posts"
          value={formatNumber(user.profile.posts_count)}
          icon={<MessageSquare className="h-4 w-4" />}
          tone="blue"
          href="/feed"
        />
        <StatCard
          label="Families supported"
          value={formatNumber(stats.families_helped)}
          hint="Across all rounds"
          icon={<Users className="h-4 w-4" />}
          tone="amber"
          href="/ration"
        />
        <StatCard
          label="Kits delivered"
          value={formatNumber(stats.kits_distributed)}
          icon={<Package className="h-4 w-4" />}
          tone="purple"
          href="/ration"
        />
      </div>

      {/* ------------------------------------------------------ reminders */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-700" aria-hidden />
              Reminders for you
            </CardTitle>
            <Link href="/reminders" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {reminders.map((row) => {
              const reminder = (Array.isArray(row.reminder) ? row.reminder[0] : row.reminder) as
                | { id: string; title: string; body: string | null; due_at: string | null; priority: keyof typeof PRIORITY_TONE }
                | undefined;
              if (!reminder) return null;

              return (
                <div key={row.id} className="rounded-xl border border-clay-200 bg-cream-100 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-clay-900">{reminder.title}</p>
                    <Badge tone={PRIORITY_TONE[reminder.priority] ?? 'neutral'}>{reminder.priority}</Badge>
                  </div>
                  {reminder.body && <p className="mt-1 text-sm text-clay-600">{truncate(reminder.body, 160)}</p>}
                  {reminder.due_at && (
                    <p className="mt-1.5 text-xs text-clay-500">Due {formatDate(reminder.due_at)}</p>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ------------------------------------------------ recent posts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>From the community</CardTitle>
            <Link href="/feed" className="text-sm font-medium text-brand-700 hover:underline">
              Open feed
            </Link>
          </CardHeader>
          <CardBody>
            {posts.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title="No posts yet"
                description="Be the first to share what happened on the last round."
                action={<ButtonLink href="/feed/new" size="sm">Write a post</ButtonLink>}
              />
            ) : (
              <ul className="divide-y divide-clay-200">
                {posts.map((post) => {
                  const author = (Array.isArray(post.author) ? post.author[0] : post.author) as
                    | { id: string; full_name: string; avatar_url: string | null }
                    | undefined;

                  return (
                    <li key={post.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href={`/feed/${post.id}`} className="group flex gap-3">
                        <Avatar src={author?.avatar_url} name={author?.full_name} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-clay-900">
                              {author?.full_name ?? 'A member'}
                            </span>
                            {post.is_announcement && <Badge tone="amber">Announcement</Badge>}
                            <span className="text-xs text-clay-500">{timeAgo(post.created_at)}</span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-clay-700 group-hover:text-clay-900">
                            {truncate(post.content, 150)}
                          </p>
                          <p className="mt-1.5 text-xs text-clay-500">
                            {post.like_count} likes · {post.comment_count} comments
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          {/* ------------------------------------------ member of month */}
          {honouree && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-saffron-500" aria-hidden />
                  Member of the month
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Link href={`/members/${honouree.id}`} className="flex items-center gap-3">
                  <Avatar src={honouree.avatar_url} name={honouree.full_name} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-clay-900">{honouree.full_name}</p>
                    <p className="text-xs text-clay-500">
                      {new Date(memberOfMonth!.year, memberOfMonth!.month - 1).toLocaleString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </Link>
                {memberOfMonth?.citation && (
                  <p className="mt-3 text-sm leading-relaxed text-clay-600">{memberOfMonth.citation}</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* ------------------------------------------- points activity */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-700" aria-hidden />
                Your activity
              </CardTitle>
            </CardHeader>
            <CardBody>
              {pointsLedger.length === 0 ? (
                <p className="text-sm text-clay-600">
                  Points appear here once an administrator verifies your activity.
                </p>
              ) : (
                <ul className="space-y-3">
                  {pointsLedger.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-clay-800">{entry.reason}</p>
                        <p className="text-xs text-clay-500">{formatDate(entry.occurred_at)}</p>
                      </div>
                      <span
                        className={
                          entry.points >= 0
                            ? 'shrink-0 text-sm font-semibold text-brand-700'
                            : 'shrink-0 text-sm font-semibold text-red-700'
                        }
                      >
                        {entry.points >= 0 ? '+' : ''}
                        {entry.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
