import Link from 'next/link';
import { Crown, HandCoins, Package, Sparkles, Trophy, Users } from 'lucide-react';
import { Avatar, Badge, Card, CardBody, CardHeader, CardTitle, EmptyState } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { ContributionRow } from '@/lib/finance/queries';
import type { DistributionRecord } from '@/lib/ration/queries';
import type { LeaderboardRow, Profile } from '@/types/database';

/* -------------------------------------------------------------- top member */

const MEDALS = ['bg-amber-100 text-amber-800', 'bg-clay-200 text-clay-700', 'bg-orange-100 text-orange-800'];

export interface Honouree {
  year: number;
  month: number;
  citation: string | null;
  profile: { id: string; full_name: string; avatar_url: string | null };
}

/**
 * The top member, with the runners-up beneath.
 *
 * Two different honours can apply, so both are shown rather than one silently
 * overriding the other: `memberOfMonth` is chosen by an administrator, while
 * the ranking below is earned from verified activity points.
 */
export function TopMemberSection({
  leaders,
  memberOfMonth,
}: {
  leaders: LeaderboardRow[];
  memberOfMonth?: Honouree | null;
}) {
  const [champion, ...runnersUp] = leaders;

  if (!champion && !memberOfMonth) {
    return (
      <EmptyState
        icon={<Trophy className="h-5 w-5" />}
        title="No top member yet"
        description="Rankings appear once an administrator verifies contributions and distributions."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ------------------------------------------------- the top member */}
      {champion && (
        <Card className="border-saffron-200 bg-gradient-to-br from-saffron-50 to-cream-50 lg:col-span-2">
          <CardBody className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="relative">
              <Avatar src={champion.avatar_url} name={champion.full_name} size={72} />
              <span
                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-saffron-500 text-cream-50 shadow-sm"
                aria-hidden
              >
                <Crown className="h-4 w-4" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <Badge tone="amber" className="mb-1.5">
                <Trophy className="h-3 w-3" aria-hidden />
                Top member
              </Badge>

              <Link
                href={`/members/${champion.profile_id}`}
                className="block font-serif text-xl font-semibold text-brand-900 hover:underline"
              >
                {champion.full_name}
              </Link>

              <p className="mt-0.5 text-sm text-clay-600">
                {formatNumber(champion.points)} points from {formatNumber(champion.activities)} verified{' '}
                {champion.activities === 1 ? 'activity' : 'activities'}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------- administrator's choice */}
      {memberOfMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-saffron-500" aria-hidden />
              Member of the month
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Link href={`/members/${memberOfMonth.profile.id}`} className="flex items-center gap-3">
              <Avatar src={memberOfMonth.profile.avatar_url} name={memberOfMonth.profile.full_name} size={44} />
              <div className="min-w-0">
                <p className="truncate font-medium text-clay-900">{memberOfMonth.profile.full_name}</p>
                <p className="text-xs text-clay-500">
                  {new Date(memberOfMonth.year, memberOfMonth.month - 1).toLocaleString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </Link>
            {memberOfMonth.citation && (
              <p className="mt-3 text-sm leading-relaxed text-clay-600">{memberOfMonth.citation}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------------------- runners-up */}
      {runnersUp.length > 0 && (
        <Card className={cn(memberOfMonth ? 'lg:col-span-3' : 'lg:col-span-1')}>
          <CardHeader>
            <CardTitle>Close behind</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className={cn('gap-x-6', memberOfMonth && 'sm:grid sm:grid-cols-2')}>
              {runnersUp.map((row, index) => (
                <li key={row.profile_id}>
                  <Link
                    href={`/members/${row.profile_id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-clay-100"
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        index + 2 <= 3 ? MEDALS[index + 1] : 'bg-clay-100 text-clay-600',
                      )}
                    >
                      {index + 2}
                    </span>
                    <Avatar src={row.avatar_url} name={row.full_name} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-clay-900">
                      {row.full_name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-brand-800">
                      {formatNumber(row.points)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- members */

/** Photo and name only — the directory itself carries the fuller card. */
export function MembersStrip({ members }: { members: Profile[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5" />}
        title="No members yet"
        description="Approved members appear here as applications are accepted."
      />
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
      {members.map((member) => (
        <li key={member.id}>
          <Link
            href={`/members/${member.id}`}
            className="flex flex-col items-center rounded-2xl border border-clay-200 bg-cream-50 px-2 py-4 text-center shadow-card transition-shadow hover:shadow-lift"
          >
            <Avatar src={member.avatar_url} name={member.full_name} size={56} />
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-clay-900">
              {member.full_name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ contribution */

/**
 * The shared ledger of verified contributions.
 *
 * `highlightId` marks the viewer's own rows so a member can find their giving
 * in the list without needing a separate screen.
 */
export function ContributionLedger({
  rows,
  highlightId,
}: {
  rows: ContributionRow[];
  highlightId?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins className="h-5 w-5" />}
        title="No verified contributions yet"
        description="Contributions appear here once an administrator has verified them."
      />
    );
  }

  return (
    <TableWrap>
      <THead>
        <TH>Contributor</TH>
        <TH>Date</TH>
        <TH>Method</TH>
        <TH align="right">Amount</TH>
      </THead>
      <TBody>
        {rows.map((row) => {
          const isMine = Boolean(highlightId) && row.contributor_id === highlightId;

          return (
            <TR key={row.id}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <Avatar src={row.contributor?.avatar_url} name={row.contributor_name} size={28} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-clay-900">
                      <span className="truncate">{row.contributor_name}</span>
                      {isMine && <Badge tone="green">You</Badge>}
                    </p>
                    {row.purpose && <p className="truncate text-xs text-clay-500">{row.purpose}</p>}
                  </div>
                </div>
              </TD>
              <TD className="whitespace-nowrap">{formatDate(row.contributed_on)}</TD>
              <TD className="capitalize text-clay-600">{row.payment_method}</TD>
              <TD align="right" className="font-medium tabular-nums">
                {formatCurrency(row.amount)}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </TableWrap>
  );
}

/* ----------------------------------------------------------- beneficiaries */

/** Families who received ration inside the selected window. */
export function BeneficiaryList({ rows, rangeLabel }: { rows: DistributionRecord[]; rangeLabel: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-5 w-5" />}
        title="No ration recorded in this period"
        description={`Nothing was distributed in the window ${rangeLabel}. Ration is not handed out on a fixed schedule — try a wider range.`}
      />
    );
  }

  return (
    <Card>
      <CardBody className="p-0">
        <ul className="divide-y divide-clay-200">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-clay-900">{row.beneficiary?.name ?? 'Unknown family'}</p>
                <p className="text-xs text-clay-500">
                  {row.beneficiary?.area ? `${row.beneficiary.area} · ` : ''}
                  Family of {formatNumber(row.beneficiary?.family_size ?? 1)}
                  {row.kit ? ` · ${row.kit.name} × ${row.quantity}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="whitespace-nowrap text-sm text-clay-700">{formatDate(row.distributed_on)}</p>
                {row.volunteer && <p className="text-xs text-clay-500">by {row.volunteer.full_name}</p>}
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
