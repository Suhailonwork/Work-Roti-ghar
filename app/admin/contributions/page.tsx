import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HandCoins, Paperclip } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getContributions } from '@/lib/finance/queries';
import { signedUrls } from '@/lib/storage';
import {
  DeleteContributionButton,
  EditContributionButton,
  NewContributionButton,
  VerifyButtons,
  type MemberOption,
} from '@/components/admin/FinanceForms';
import { Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/types/database';

const PAGE_SIZE = 25;
const STATUS_TONE = { verified: 'green', pending: 'amber', rejected: 'red' } as const;
const STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected'];

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Contributions', path: '/admin/contributions', noIndex: true });
}

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as VerificationStatus)
    ? (params.status as VerificationStatus)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  const [{ rows, total }, membersResult] = await Promise.all([
    getContributions({ status, page, pageSize: PAGE_SIZE }),
    supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name').limit(500),
  ]);

  const receiptPaths = rows.map((row) => row.receipt_path).filter((path): path is string => Boolean(path));
  const receiptUrls = await signedUrls(supabase, 'receipts', receiptPaths, 60 * 10);

  const members: MemberOption[] = (membersResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name,
  }));

  const tabs = [
    { label: 'All', href: '/admin/contributions' },
    { label: 'Pending', href: '/admin/contributions?status=pending' },
    { label: 'Verified', href: '/admin/contributions?status=verified' },
    { label: 'Rejected', href: '/admin/contributions?status=rejected' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Contributions"
        description="Only verified contributions count towards the balance."
        action={<NewContributionButton members={members} />}
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-5 w-5" />}
          title="Nothing recorded yet"
          description="Record what members contribute towards the running costs."
          action={<NewContributionButton members={members} />}
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Contributor</TH>
              <TH>Date</TH>
              <TH>Method</TH>
              <TH align="right">Amount</TH>
              <TH align="center">Receipt</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7} message="Nothing here." />
              ) : (
                rows.map((row) => {
                  const receiptUrl = row.receipt_path ? receiptUrls[row.receipt_path] : null;

                  return (
                    <TR key={row.id}>
                      <TD>
                        <p className="font-medium text-clay-900">{row.contributor_name}</p>
                        {row.purpose && <p className="text-xs text-clay-500">{row.purpose}</p>}
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(row.contributed_on)}</TD>
                      <TD className="capitalize text-clay-600">{row.payment_method}</TD>
                      <TD align="right" className="font-medium tabular-nums">
                        {formatCurrency(row.amount)}
                      </TD>
                      <TD align="center">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" aria-hidden />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-clay-400">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[row.verification_status]}>{row.verification_status}</Badge>
                      </TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-1">
                          <VerifyButtons id={row.id} kind="contribution" status={row.verification_status} />
                          <EditContributionButton contribution={row} members={members} />
                          <DeleteContributionButton id={row.id} />
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </TableWrap>

          <Suspense fallback={null}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
          </Suspense>
        </>
      )}
    </div>
  );
}
