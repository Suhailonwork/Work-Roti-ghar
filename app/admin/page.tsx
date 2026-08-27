import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Flag,
  Package,
  Scale,
  Truck,
  UserPlus,
  Users,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getImpactStats } from '@/lib/cms/queries';
import {
  getExpensesByCategory,
  getFinanceSummary,
  getMonthlyFinance,
  getPendingFinanceCounts,
} from '@/lib/finance/queries';
import { ExpenseCategoryChart, MonthlyFinanceChart } from '@/components/finance/FinanceCharts';
import { Card, CardBody, CardHeader, CardTitle, SectionHeading, StatCard } from '@/components/ui';
import { auditLabel } from '@/lib/audit';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Admin dashboard', path: '/admin', noIndex: true });
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    stats,
    summary,
    monthly,
    byCategory,
    pendingFinance,
    applicationsResult,
    reportsResult,
    auditResult,
  ] = await Promise.all([
    getImpactStats(),
    getFinanceSummary(),
    getMonthlyFinance(6),
    getExpensesByCategory(),
    getPendingFinanceCounts(),
    supabase.from('member_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('audit_logs')
      .select('id, action, summary, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const pendingApplications = applicationsResult.count ?? 0;
  const openReports = reportsResult.count ?? 0;
  const auditRows = (auditResult.data ?? []) as unknown as Record<string, unknown>[];

  const alerts = [
    pendingApplications > 0 && {
      href: '/admin/applications',
      label: `${pendingApplications} application${pendingApplications === 1 ? '' : 's'} to review`,
    },
    pendingFinance.contributions > 0 && {
      href: '/admin/contributions?status=pending',
      label: `${pendingFinance.contributions} contribution${
        pendingFinance.contributions === 1 ? '' : 's'
      } to verify`,
    },
    pendingFinance.expenses > 0 && {
      href: '/admin/expenses?status=pending',
      label: `${pendingFinance.expenses} expense${pendingFinance.expenses === 1 ? '' : 's'} to verify`,
    },
    openReports > 0 && {
      href: '/admin/reports',
      label: `${openReports} open report${openReports === 1 ? '' : 's'}`,
    },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Dashboard"
        description="Where Roti Ghar stands today, and what is waiting for you."
      />

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <Link
              key={alert.href}
              href={alert.href}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
            >
              {alert.label}
            </Link>
          ))}
        </div>
      )}

      {/* --------------------------------------------------- people & aid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Active members"
          value={formatNumber(stats.active_members)}
          icon={<Users className="h-4 w-4" />}
          tone="green"
          href="/admin/members"
        />
        <StatCard
          label="Pending applications"
          value={formatNumber(pendingApplications)}
          icon={<UserPlus className="h-4 w-4" />}
          tone={pendingApplications > 0 ? 'amber' : 'neutral'}
          href="/admin/applications"
        />
        <StatCard
          label="Families helped"
          value={formatNumber(stats.families_helped)}
          icon={<Package className="h-4 w-4" />}
          tone="blue"
          href="/admin/beneficiaries"
        />
        <StatCard
          label="Kits distributed"
          value={formatNumber(stats.kits_distributed)}
          icon={<Truck className="h-4 w-4" />}
          tone="purple"
          href="/admin/distributions"
        />
      </div>

      {/* ------------------------------------------------------- finance */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard
          label="Total received"
          value={formatCurrency(summary.total_received)}
          hint="Verified contributions"
          icon={<ArrowDownLeft className="h-4 w-4" />}
          tone="green"
          href="/admin/contributions"
        />
        <StatCard
          label="Total spent"
          value={formatCurrency(summary.total_spent)}
          hint="Verified expenses"
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="amber"
          href="/admin/expenses"
        />
        <StatCard
          label="Balance"
          value={formatCurrency(summary.balance)}
          hint="Received − spent"
          icon={<Scale className="h-4 w-4" />}
          tone={summary.balance >= 0 ? 'blue' : 'red'}
        />
      </div>

      {/* -------------------------------------------------------- charts */}
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

      {/* -------------------------------------------- distribution stats */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard label="Delivery rounds" value={formatNumber(stats.distributions)} tone="neutral" />
        <StatCard label="Areas served" value={formatNumber(stats.areas_served)} tone="neutral" />
        <StatCard
          label="Volunteers"
          value={formatNumber(stats.volunteers)}
          tone="neutral"
          href="/admin/members?role=volunteer"
        />
      </div>

      {/* -------------------------------------------------- recent audit */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Link href="/admin/audit-logs" className="text-sm font-medium text-brand-700 hover:underline">
            All audit logs
          </Link>
        </CardHeader>
        <CardBody>
          {auditRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-clay-500">
              Administrative actions will be recorded here.
            </p>
          ) : (
            <ul className="divide-y divide-clay-200">
              {auditRows.map((row) => {
                const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
                const name = (actor as { full_name?: string } | null)?.full_name ?? 'System';

                return (
                  <li key={row.id as string} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-clay-900">
                        <span className="font-medium">{auditLabel(row.action as string)}</span>
                        {Boolean(row.summary) && (
                          <span className="text-clay-600"> — {row.summary as string}</span>
                        )}
                      </p>
                      <p className="text-xs text-clay-500">by {name}</p>
                    </div>
                    <span className="shrink-0 text-xs text-clay-500">{timeAgo(row.created_at as string)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {openReports > 0 && (
        <Link
          href="/admin/reports"
          className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          <Flag className="h-4 w-4" aria-hidden />
          {openReports} reported item{openReports === 1 ? '' : 's'} waiting for a decision
        </Link>
      )}
    </div>
  );
}
