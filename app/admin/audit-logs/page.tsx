import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ScrollText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { auditLabel } from '@/lib/audit';
import { EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 40;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Audit logs', path: '/admin/audit-logs', noIndex: true });
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select(
      'id, action, entity_type, entity_id, summary, ip_address, created_at, actor:profiles!audit_logs_actor_id_fkey(id, full_name)',
      { count: 'exact' },
    );

  if (params.entity) query = query.eq('entity_type', params.entity);

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Audit logs"
        description="Every approval, role change, financial edit, beneficiary change and content removal. Append-only — these records cannot be edited or deleted."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-5 w-5" />}
          title="Nothing logged yet"
          description="Administrative actions are recorded here as they happen."
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Action</TH>
              <TH>Details</TH>
              <TH>Who</TH>
              <TH align="right">When</TH>
            </THead>
            <TBody>
              {rows.map((row) => {
                const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
                const a = actor as { id: string; full_name: string } | null;

                return (
                  <TR key={row.id as string}>
                    <TD className="whitespace-nowrap font-medium text-clay-900">
                      {auditLabel(row.action as string)}
                    </TD>
                    <TD className="max-w-lg text-clay-700">{(row.summary as string) ?? '—'}</TD>
                    <TD className="whitespace-nowrap text-clay-600">{a?.full_name ?? 'System'}</TD>
                    <TD align="right" className="whitespace-nowrap text-xs text-clay-500">
                      {formatDateTime(row.created_at as string)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </TableWrap>

          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
          </Suspense>
        </>
      )}
    </div>
  );
}
