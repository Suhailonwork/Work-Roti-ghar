import type { Metadata } from 'next';
import { Inbox } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ApplicationCard } from '@/components/admin/ApplicationCard';
import { Badge, EmptyState, SectionHeading } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import type { MemberApplication } from '@/types/database';
import { Suspense } from 'react';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Applications', path: '/admin/applications', noIndex: true });
}

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status === 'approved' || params.status === 'rejected' ? params.status : 'pending';

  const supabase = await createClient();

  const { data } = await supabase
    .from('member_applications')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' })
    .limit(60);

  const applications = (data ?? []) as MemberApplication[];

  const tabs = [
    { label: 'Pending', href: '/admin/applications' },
    { label: 'Approved', href: '/admin/applications?status=approved' },
    { label: 'Rejected', href: '/admin/applications?status=rejected' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Applications"
        description="Approve people you or a member can vouch for. Approval grants access to the community feed and the members area."
      />

      <Suspense fallback={null}>
        <Tabs items={tabs} />
      </Suspense>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={status === 'pending' ? 'Nothing waiting' : `No ${status} applications`}
          description={
            status === 'pending'
              ? 'New applications will appear here as they come in.'
              : 'Applications you have decided on will be listed here.'
          }
        />
      ) : status === 'pending' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <TableWrap>
          <THead>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Applied</TH>
            <TH>Note</TH>
            <TH align="right">Status</TH>
          </THead>
          <TBody>
            {applications.length === 0 ? (
              <TableEmpty colSpan={5} message="Nothing here." />
            ) : (
              applications.map((application) => (
                <TR key={application.id}>
                  <TD className="font-medium text-clay-900">{application.full_name}</TD>
                  <TD>{application.email}</TD>
                  <TD>{formatDate(application.created_at)}</TD>
                  <TD className="max-w-xs truncate text-clay-600">{application.review_notes ?? '—'}</TD>
                  <TD align="right">
                    <Badge tone={STATUS_TONE[application.status as keyof typeof STATUS_TONE]}>
                      {application.status}
                    </Badge>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </TableWrap>
      )}
    </div>
  );
}
