import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MemberRow } from '@/components/admin/MemberRow';
import { MemberSearch } from '@/components/members/MemberSearch';
import { EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TH, THead } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import type { Profile, UserRole, UserStatus } from '@/types/database';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Members', path: '/admin/members', noIndex: true });
}

const ROLES: UserRole[] = ['member', 'volunteer', 'admin'];
const STATUSES: UserStatus[] = ['pending', 'active', 'rejected', 'suspended', 'inactive'];

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; q?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const role = ROLES.includes(params.role as UserRole) ? (params.role as UserRole) : undefined;
  const status = STATUSES.includes(params.status as UserStatus) ? (params.status as UserStatus) : undefined;
  const search = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, count } = await query
    .order('full_name', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const members = (data ?? []) as Profile[];

  // Contact details are admin-readable under RLS; fetched separately so the
  // member-facing directory query can never accidentally include them.
  const { data: contacts } = members.length
    ? await supabase
        .from('profile_contacts')
        .select('profile_id, email, mobile')
        .in(
          'profile_id',
          members.map((m) => m.id),
        )
    : { data: [] };

  const contactMap = new Map((contacts ?? []).map((row) => [row.profile_id, row]));

  const tabs = [
    { label: 'Everyone', href: '/admin/members', count: count ?? 0 },
    { label: 'Members', href: '/admin/members?role=member' },
    { label: 'Volunteers', href: '/admin/members?role=volunteer' },
    { label: 'Admins', href: '/admin/members?role=admin' },
    { label: 'Suspended', href: '/admin/members?status=suspended' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Members"
        description="Change roles and account status. Every change here is written to the audit log."
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl" />}>
        <MemberSearch basePath="/admin/members" />
      </Suspense>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No members matched"
          description="Try clearing the filters or searching for a different name."
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Member</TH>
              <TH>Mobile</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH align="right">Points</TH>
              <TH align="right">Joined</TH>
            </THead>
            <TBody>
              {members.length === 0 ? (
                <TableEmpty colSpan={6} message="No members." />
              ) : (
                members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    contact={contactMap.get(member.id) ?? null}
                    isSelf={member.id === admin.id}
                  />
                ))
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
