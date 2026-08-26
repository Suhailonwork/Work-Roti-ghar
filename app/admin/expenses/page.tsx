import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Banknote, Paperclip } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getExpenses } from '@/lib/finance/queries';
import { signedUrls } from '@/lib/storage';
import {
  DeleteExpenseButton,
  EditExpenseButton,
  NewExpenseButton,
  VerifyButtons,
} from '@/components/admin/FinanceForms';
import { Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ExpenseCategory, VerificationStatus } from '@/types/database';

const PAGE_SIZE = 25;
const STATUS_TONE = { verified: 'green', pending: 'amber', rejected: 'red' } as const;
const STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected'];
const CATEGORIES: ExpenseCategory[] = ['ration', 'transport', 'packaging', 'storage', 'utilities', 'other'];

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Expenses', path: '/admin/expenses', noIndex: true });
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as VerificationStatus)
    ? (params.status as VerificationStatus)
    : undefined;
  const category = CATEGORIES.includes(params.category as ExpenseCategory)
    ? (params.category as ExpenseCategory)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  const { rows, total } = await getExpenses({ status, category, page, pageSize: PAGE_SIZE });

  const receiptPaths = rows.map((row) => row.receipt_path).filter((path): path is string => Boolean(path));
  const receiptUrls = await signedUrls(supabase, 'receipts', receiptPaths, 60 * 10);

  const tabs = [
    { label: 'All', href: '/admin/expenses' },
    { label: 'Pending', href: '/admin/expenses?status=pending' },
    { label: 'Verified', href: '/admin/expenses?status=verified' },
    { label: 'Rejected', href: '/admin/expenses?status=rejected' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Expenses"
        description="Only verified expenses count against the balance."
        action={<NewExpenseButton />}
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="Nothing recorded yet"
          description="Record what the organisation spends, with a receipt where you have one."
          action={<NewExpenseButton />}
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Description</TH>
              <TH>Category</TH>
              <TH>Vendor</TH>
              <TH>Date</TH>
              <TH align="right">Amount</TH>
              <TH align="center">Receipt</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={8} message="Nothing here." />
              ) : (
                rows.map((row) => {
                  const receiptUrl = row.receipt_path ? receiptUrls[row.receipt_path] : null;

                  return (
                    <TR key={row.id}>
                      <TD className="font-medium text-clay-900">{row.description}</TD>
                      <TD className="capitalize text-clay-600">{row.category}</TD>
                      <TD className="text-clay-600">{row.vendor ?? '—'}</TD>
                      <TD className="whitespace-nowrap">{formatDate(row.spent_on)}</TD>
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
                          <VerifyButtons id={row.id} kind="expense" status={row.verification_status} />
                          <EditExpenseButton expense={row} />
                          <DeleteExpenseButton id={row.id} />
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
