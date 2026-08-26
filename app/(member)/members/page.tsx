import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { getMemberCounts, getMembers, type MemberTab } from '@/lib/members/queries';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberSearch } from '@/components/members/MemberSearch';
import { EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Members', path: '/members', noIndex: true });
}

function tabFrom(value: string | undefined): MemberTab {
  return value === 'new' || value === 'active' ? value : 'all';
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  await requireApproved('/members');

  const params = await searchParams;
  const tab = tabFrom(params.tab);
  const search = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ members, total }, counts] = await Promise.all([
    getMembers({ tab, search, page, pageSize: PAGE_SIZE }),
    getMemberCounts(),
  ]);

  const tabs = [
    { label: 'All members', href: '/members', count: counts.all },
    { label: 'Top members', href: '/members/top' },
    { label: 'New members', href: '/members?tab=new', count: counts.recent },
    { label: 'Active members', href: '/members?tab=active' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Members"
        description="Everyone who keeps Roti Ghar running. Contact details stay private."
        action={
          <ButtonLink href="/members/top" variant="secondary" size="sm">
            View leaderboard
          </ButtonLink>
        }
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl" />}>
        <MemberSearch />
      </Suspense>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={search ? `No members matched “${search}”` : 'No members yet'}
          description={
            search
              ? 'Try a different spelling, or part of a first name.'
              : 'Approved members will appear here as applications are accepted.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          <Suspense fallback={null}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
          </Suspense>
        </>
      )}
    </div>
  );
}
