import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { Suspense } from 'react';
import { Trophy } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLeaderboard, getMemberOfMonth, type LeaderboardPeriod } from '@/lib/members/queries';
import { AdjustPointsButton, MemberOfMonthButton, type MemberChoice } from '@/components/admin/PointsForms';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { removePointTransactionAction } from '@/lib/actions/members';
import { Avatar, Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, formatNumber } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Top members', path: '/admin/top-members', noIndex: true });
}

function periodFrom(value: string | undefined): LeaderboardPeriod {
  return value === 'month' || value === 'year' ? value : 'all';
}

export default async function AdminTopMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const period = periodFrom(params.period);

  const supabase = await createClient();

  const [overall, contributors, volunteers, honourees, membersResult, ledgerResult] = await Promise.all([
    getLeaderboard({ period, limit: 25 }),
    getLeaderboard({ category: 'contribution', period, limit: 10 }),
    getLeaderboard({ category: 'volunteer', period, limit: 10 }),
    getMemberOfMonth(6),
    supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name').limit(500),
    supabase
      .from('point_transactions')
      .select('id, points, reason, category, occurred_at, profile:profiles!point_transactions_profile_id_fkey(id, full_name)')
      .order('occurred_at', { ascending: false })
      .limit(30),
  ]);

  const members: MemberChoice[] = (membersResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name,
  }));

  const ledger = (ledgerResult.data ?? []) as unknown as Record<string, unknown>[];

  const periodTabs = [
    { label: 'This month', href: '/admin/top-members?period=month' },
    { label: 'This year', href: '/admin/top-members?period=year' },
    { label: 'All time', href: '/admin/top-members' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Top members"
        description="Rankings come from verified point transactions. Award, deduct, and pick the member of the month."
        action={
          <div className="flex flex-wrap gap-2">
            <MemberOfMonthButton members={members} />
            <AdjustPointsButton members={members} />
          </div>
        }
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={periodTabs} />
      </Suspense>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand-700" aria-hidden />
              Overall leaderboard
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {overall.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-clay-500">
                No verified points in this period yet.
              </p>
            ) : (
              <ol className="divide-y divide-clay-200">
                {overall.map((row, index) => (
                  <li key={row.profile_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 shrink-0 text-sm font-semibold text-clay-500">{index + 1}</span>
                    <Avatar src={row.avatar_url} name={row.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/members/${row.profile_id}`}
                        className="block truncate text-sm font-medium text-clay-900 hover:underline"
                      >
                        {row.full_name}
                      </Link>
                      <p className="text-xs text-clay-500">
                        {formatNumber(row.activities)} verified{' '}
                        {row.activities === 1 ? 'activity' : 'activities'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-800">
                      {formatNumber(row.points)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Top contributors</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {contributors.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-clay-500">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-clay-200">
                  {contributors.map((row) => (
                    <li key={row.profile_id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <span className="truncate text-sm text-clay-800">{row.full_name}</span>
                      <span className="shrink-0 text-sm font-medium text-brand-800">{row.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top volunteers</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {volunteers.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-clay-500">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-clay-200">
                  {volunteers.map((row) => (
                    <li key={row.profile_id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <span className="truncate text-sm text-clay-800">{row.full_name}</span>
                      <span className="shrink-0 text-sm font-medium text-brand-800">{row.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------ member of month */}
      <Card>
        <CardHeader>
          <CardTitle>Member of the month</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {honourees.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-clay-500">Nobody selected yet.</p>
          ) : (
            <ul className="divide-y divide-clay-200">
              {honourees.map((entry) =>
                entry.profile ? (
                  <li key={`${entry.year}-${entry.month}`} className="flex items-center gap-3 px-5 py-3">
                    <Avatar src={entry.profile.avatar_url} name={entry.profile.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-clay-900">{entry.profile.full_name}</p>
                      {entry.citation && <p className="truncate text-xs text-clay-500">{entry.citation}</p>}
                    </div>
                    <Badge tone="amber">
                      {new Date(entry.year, entry.month - 1).toLocaleString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Badge>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------- recent ledger */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-clay-900">Recent point transactions</h2>

        {ledger.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-5 w-5" />}
            title="No points awarded yet"
            description="Recording distributions and verifying contributions awards points automatically."
          />
        ) : (
          <TableWrap>
            <THead>
              <TH>Member</TH>
              <TH>Reason</TH>
              <TH>Category</TH>
              <TH align="right">Points</TH>
              <TH align="right">When</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {ledger.map((row) => {
                const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
                const p = profile as { id: string; full_name: string } | null;
                const points = row.points as number;

                return (
                  <TR key={row.id as string}>
                    <TD>
                      {p ? (
                        <Link href={`/members/${p.id}`} className="font-medium text-clay-900 hover:underline">
                          {p.full_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD className="max-w-sm text-clay-700">{row.reason as string}</TD>
                    <TD className="capitalize text-clay-600">{row.category as string}</TD>
                    <TD
                      align="right"
                      className={points >= 0 ? 'font-semibold text-brand-700' : 'font-semibold text-red-700'}
                    >
                      {points >= 0 ? '+' : ''}
                      {points}
                    </TD>
                    <TD align="right" className="whitespace-nowrap text-xs text-clay-500">
                      {formatDate(row.occurred_at as string)}
                    </TD>
                    <TD align="right">
                      <DeleteButton
                        action={() => removePointTransactionAction(row.id as string)}
                        title="Remove this points entry?"
                        description="The member's total is recalculated immediately."
                        confirmLabel="Remove"
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
