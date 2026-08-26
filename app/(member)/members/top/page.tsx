import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Award, HandHeart, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { getLeaderboard, getMemberOfMonth, type LeaderboardPeriod } from '@/lib/members/queries';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  SectionHeading,
  Skeleton,
} from '@/components/ui';
import { Tabs } from '@/components/ui/Tabs';
import { buildStaticMetadata } from '@/lib/seo';
import { cn, formatNumber } from '@/lib/utils';
import type { LeaderboardRow, PointCategory } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Top members', path: '/members/top', noIndex: true });
}

function periodFrom(value: string | undefined): LeaderboardPeriod {
  return value === 'month' || value === 'year' ? value : 'all';
}

const CATEGORIES: {
  key: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  category?: PointCategory;
}[] = [
  {
    key: 'contributors',
    title: 'Top contributors',
    description: 'Verified contributions towards the running costs.',
    icon: Trophy,
    category: 'contribution',
  },
  {
    key: 'volunteers',
    title: 'Top volunteers',
    description: 'Packing days, delivery runs and time given.',
    icon: HandHeart,
    category: 'volunteer',
  },
  {
    key: 'active',
    title: 'Most active',
    description: 'Points from all verified activity combined.',
    icon: TrendingUp,
  },
];

const MEDALS = ['bg-amber-100 text-amber-800', 'bg-clay-200 text-clay-700', 'bg-orange-100 text-orange-800'];

function LeaderRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
  return (
    <li>
      <Link
        href={`/members/${row.profile_id}`}
        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-clay-100"
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            rank <= 3 ? MEDALS[rank - 1] : 'bg-clay-100 text-clay-600',
          )}
        >
          {rank}
        </span>

        <Avatar src={row.avatar_url} name={row.full_name} size={36} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-clay-900">{row.full_name}</p>
          <p className="text-xs text-clay-500">
            {formatNumber(row.activities)} verified {row.activities === 1 ? 'activity' : 'activities'}
          </p>
        </div>

        <span className="shrink-0 text-sm font-semibold text-brand-800">{formatNumber(row.points)}</span>
      </Link>
    </li>
  );
}

export default async function TopMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireApproved('/members/top');

  const params = await searchParams;
  const period = periodFrom(params.period);

  const [contributors, volunteers, active, honourees] = await Promise.all([
    getLeaderboard({ category: 'contribution', period, limit: 10 }),
    getLeaderboard({ category: 'volunteer', period, limit: 10 }),
    getLeaderboard({ period, limit: 10 }),
    getMemberOfMonth(3),
  ]);

  const boards = { contributors, volunteers, active };

  const periodTabs = [
    { label: 'This month', href: '/members/top?period=month' },
    { label: 'This year', href: '/members/top?period=year' },
    { label: 'All time', href: '/members/top' },
  ];

  const [current, ...past] = honourees;

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Top members"
        description="Rankings come from verified activity points. An administrator verifies each entry before it counts."
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={periodTabs} />
      </Suspense>

      {/* ------------------------------------------- member of the month */}
      {current?.profile && (
        <Card className="border-saffron-200 bg-gradient-to-br from-saffron-50 to-cream-50">
          <CardBody className="flex flex-wrap items-center gap-4 sm:gap-5">
            <Avatar src={current.profile.avatar_url} name={current.profile.full_name} size={64} />
            <div className="min-w-0 flex-1">
              <Badge tone="amber" className="mb-1.5">
                <Sparkles className="h-3 w-3" aria-hidden />
                Member of the month
              </Badge>
              <Link
                href={`/members/${current.profile.id}`}
                className="block font-serif text-xl font-semibold text-brand-900 hover:underline"
              >
                {current.profile.full_name}
              </Link>
              <p className="text-sm text-clay-600">
                {new Date(current.year, current.month - 1).toLocaleString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {current.citation && (
                <p className="mt-2 text-sm leading-relaxed text-clay-700">{current.citation}</p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ------------------------------------------------- leaderboards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {CATEGORIES.map((section) => {
          const rows = boards[section.key as keyof typeof boards];
          const Icon = section.icon;

          return (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand-700" aria-hidden />
                  {section.title}
                </CardTitle>
                <p className="mt-1 text-sm text-clay-600">{section.description}</p>
              </CardHeader>
              <CardBody>
                {rows.length === 0 ? (
                  <p className="py-4 text-center text-sm text-clay-500">
                    No verified points in this period yet.
                  </p>
                ) : (
                  <ol className="space-y-0.5">
                    {rows.map((row, index) => (
                      <LeaderRow key={row.profile_id} row={row} rank={index + 1} />
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ----------------------------------------------- past honourees */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-700" aria-hidden />
              Previously honoured
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-clay-200">
              {past.map((entry) =>
                entry.profile ? (
                  <li key={`${entry.year}-${entry.month}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar src={entry.profile.avatar_url} name={entry.profile.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${entry.profile.id}`} className="text-sm font-medium text-clay-900 hover:underline">
                        {entry.profile.full_name}
                      </Link>
                      {entry.citation && <p className="truncate text-xs text-clay-500">{entry.citation}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-clay-500">
                      {new Date(entry.year, entry.month - 1).toLocaleString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </CardBody>
        </Card>
      )}

      {contributors.length === 0 && volunteers.length === 0 && active.length === 0 && (
        <EmptyState
          icon={<Trophy className="h-5 w-5" />}
          title="No rankings yet"
          description="Once an administrator verifies distributions and contributions, points appear here."
        />
      )}
    </div>
  );
}
