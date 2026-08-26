import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Flag } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReportControls } from '@/components/admin/ModerationControls';
import { Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import type { ReportStatus } from '@/types/database';

const STATUSES: ReportStatus[] = ['open', 'reviewing', 'resolved', 'dismissed'];
const STATUS_TONE = { open: 'red', reviewing: 'amber', resolved: 'green', dismissed: 'neutral' } as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Reports', path: '/admin/reports', noIndex: true });
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = STATUSES.includes(params.status as ReportStatus) ? (params.status as ReportStatus) : 'open';

  const supabase = await createClient();

  const { data } = await supabase
    .from('reports')
    .select(
      'id, target_type, target_id, reason, details, status, resolution_notes, created_at, reporter:profiles!reports_reporter_id_fkey(id, full_name)',
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(80);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const tabs = [
    { label: 'Open', href: '/admin/reports' },
    { label: 'Resolved', href: '/admin/reports?status=resolved' },
    { label: 'Dismissed', href: '/admin/reports?status=dismissed' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Reports"
        description="Content members have flagged. Whoever reported it is told the outcome."
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-5 w-5" />}
          title={status === 'open' ? 'Nothing flagged' : `No ${status} reports`}
          description="Reports raised from the feed appear here."
        />
      ) : (
        <TableWrap>
          <THead>
            <TH>What</TH>
            <TH>Reason</TH>
            <TH>Reported by</TH>
            <TH>When</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {rows.map((row) => {
              const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter;
              const r = reporter as { id: string; full_name: string } | null;
              const targetType = row.target_type as string;
              const href =
                targetType === 'post'
                  ? `/feed/${row.target_id as string}`
                  : targetType === 'profile'
                    ? `/members/${row.target_id as string}`
                    : null;

              return (
                <TR key={row.id as string}>
                  <TD>
                    {href ? (
                      <Link href={href} className="font-medium capitalize text-brand-700 hover:underline">
                        {targetType}
                      </Link>
                    ) : (
                      <span className="font-medium capitalize text-clay-800">{targetType}</span>
                    )}
                  </TD>
                  <TD className="max-w-xs">
                    <p className="text-clay-800">{row.reason as string}</p>
                    {Boolean(row.details) && (
                      <p className="mt-0.5 text-xs text-clay-500">{row.details as string}</p>
                    )}
                    {Boolean(row.resolution_notes) && (
                      <p className="mt-1 text-xs text-brand-700">Outcome: {row.resolution_notes as string}</p>
                    )}
                  </TD>
                  <TD>
                    {r ? (
                      <Link href={`/members/${r.id}`} className="text-sm hover:underline">
                        {r.full_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-clay-600">
                    {formatDate(row.created_at as string)}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[row.status as ReportStatus]}>{row.status as string}</Badge>
                  </TD>
                  <TD align="right">
                    <ReportControls reportId={row.id as string} status={row.status as ReportStatus} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </TableWrap>
      )}
    </div>
  );
}
