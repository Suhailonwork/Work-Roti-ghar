import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import {
  getContributions,
  getExpenses,
  getExpensesByCategory,
  getFinanceSummary,
  getMonthlyFinance,
  getPendingFinanceCounts,
} from '@/lib/finance/queries';
import { ExpenseCategoryChart, MonthlyFinanceChart } from '@/components/finance/FinanceCharts';
import { Badge, Card, CardBody, CardHeader, CardTitle, SectionHeading, StatCard } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { ButtonLink } from '@/components/ui/Button';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Finance', path: '/finance', noIndex: true });
}

const STATUS_TONE: Record<VerificationStatus, 'green' | 'amber' | 'red'> = {
  verified: 'green',
  pending: 'amber',
  rejected: 'red',
};

export default async function FinancePage() {
  const user = await requireRole(['admin', 'volunteer'], '/finance');
  const isAdmin = user.profile.role === 'admin';

  const [summary, monthly, byCategory, pending, contributions, expenses] = await Promise.all([
    getFinanceSummary(),
    getMonthlyFinance(6),
    getExpensesByCategory(),
    getPendingFinanceCounts(),
    // The full contribution ledger, with pending and rejected paperwork, is
    // admin-only under RLS; a volunteer gets an empty list here and reads the
    // verified ledger on the dashboard instead.
    isAdmin ? getContributions({ page: 1, pageSize: 8 }) : Promise.resolve({ rows: [], total: 0 }),
    getExpenses({ page: 1, pageSize: 8 }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Finance"
        description="Every figure below counts only verified records. Nothing enters the balance until an administrator checks it."
        action={
          isAdmin ? (
            <div className="flex gap-2">
              <ButtonLink href="/admin/contributions" size="sm" variant="secondary">
                Contributions
              </ButtonLink>
              <ButtonLink href="/admin/expenses" size="sm" variant="secondary">
                Expenses
              </ButtonLink>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard
          label="Total received"
          value={formatCurrency(summary.total_received)}
          hint="Verified contributions"
          icon={<ArrowDownLeft className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Total spent"
          value={formatCurrency(summary.total_spent)}
          hint="Verified expenses"
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Current balance"
          value={formatCurrency(summary.balance)}
          hint="Received − spent"
          icon={<Scale className="h-4 w-4" />}
          tone={summary.balance >= 0 ? 'blue' : 'red'}
        />
      </div>

      {isAdmin && (pending.contributions > 0 || pending.expenses > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Waiting for verification:{' '}
          {pending.contributions > 0 && (
            <Link href="/admin/contributions?status=pending" className="font-medium underline">
              {pending.contributions} contribution{pending.contributions === 1 ? '' : 's'}
            </Link>
          )}
          {pending.contributions > 0 && pending.expenses > 0 && ' · '}
          {pending.expenses > 0 && (
            <Link href="/admin/expenses?status=pending" className="font-medium underline">
              {pending.expenses} expense{pending.expenses === 1 ? '' : 's'}
            </Link>
          )}
          .
        </div>
      )}

      {/* --------------------------------------------------------- charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Money in and out</CardTitle>
            <p className="mt-1 text-sm text-clay-600">Verified records over the last six months.</p>
          </CardHeader>
          <CardBody>
            <MonthlyFinanceChart data={monthly} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where the money goes</CardTitle>
            <p className="mt-1 text-sm text-clay-600">Verified spending by category, all time.</p>
          </CardHeader>
          <CardBody>
            <ExpenseCategoryChart data={byCategory} />
          </CardBody>
        </Card>
      </div>

      {/* -------------------------------------------------- contributions */}
      {isAdmin && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-clay-900">Recent contributions</h2>
            <Link href="/admin/contributions" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </div>

          <TableWrap>
            <THead>
              <TH>Contributor</TH>
              <TH>Date</TH>
              <TH>Method</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Status</TH>
            </THead>
            <TBody>
              {contributions.rows.length === 0 ? (
                <TableEmpty colSpan={5} message="No contributions recorded yet." />
              ) : (
                contributions.rows.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium text-clay-900">{row.contributor_name}</TD>
                    <TD>{formatDate(row.contributed_on)}</TD>
                    <TD className="capitalize">{row.payment_method}</TD>
                    <TD align="right" className="font-medium tabular-nums">
                      {formatCurrency(row.amount)}
                    </TD>
                    <TD align="right">
                      <Badge tone={STATUS_TONE[row.verification_status]}>{row.verification_status}</Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </TableWrap>
        </section>
      )}

      {/* ------------------------------------------------------- expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-clay-900">
            {isAdmin ? 'Recent expenses' : 'Verified expenses'}
          </h2>
          {isAdmin && (
            <Link href="/admin/expenses" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          )}
        </div>

        <TableWrap>
          <THead>
            <TH>Description</TH>
            <TH>Category</TH>
            <TH>Date</TH>
            <TH align="right">Amount</TH>
            <TH align="right">Status</TH>
          </THead>
          <TBody>
            {expenses.rows.length === 0 ? (
              <TableEmpty
                colSpan={5}
                message={isAdmin ? 'No expenses recorded yet.' : 'No verified expenses yet.'}
              />
            ) : (
              expenses.rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium text-clay-900">{row.description}</TD>
                  <TD className="capitalize">{row.category}</TD>
                  <TD>{formatDate(row.spent_on)}</TD>
                  <TD align="right" className="font-medium tabular-nums">
                    {formatCurrency(row.amount)}
                  </TD>
                  <TD align="right">
                    <Badge tone={STATUS_TONE[row.verification_status]}>{row.verification_status}</Badge>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </TableWrap>
      </section>
    </div>
  );
}
