import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Package, PackageOpen, Truck, Users } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getImpactStats } from '@/lib/cms/queries';
import { getDistributionsInRange, getRationSummaryInRange } from '@/lib/ration/queries';
import { resolveRange } from '@/lib/ranges';
import { BeneficiaryList } from '@/components/dashboard/Sections';
import { RangeFilter } from '@/components/ration/RangeFilter';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  SectionHeading,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatNumber } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Ration', path: '/ration', noIndex: true });
}

const RECORDS_PER_PAGE = 25;

export default async function RationPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireApproved('/ration');
  const supabase = await createClient();
  const isAdmin = user.profile.role === 'admin';

  // Defaults to the last month; any date the member picks arrives in the URL.
  const range = resolveRange(await searchParams);

  const [stats, kitsResult, rangeSummary, distributions] = await Promise.all([
    getImpactStats(),
    supabase
      .from('ration_kits')
      .select(
        'id, name, description, estimated_cost, is_active, items:ration_kit_items(id, item_name, quantity, unit, position)',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    getRationSummaryInRange({ from: range.from, to: range.to }),
    getDistributionsInRange({ from: range.from, to: range.to, page: 1, pageSize: RECORDS_PER_PAGE }),
  ]);

  // Embedded relations are not inferable while Relationships stay empty in the
  // hand-written Database types, so the shape is declared here instead.
  const kits = (kitsResult.data ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    estimated_cost: number;
    is_active: boolean;
    items: { id: string; item_name: string; quantity: number; unit: string; position: number }[];
  }[];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Ration"
        description="What goes in a kit, and which families it has reached."
        action={
          isAdmin ? (
            <ButtonLink href="/admin/distributions?new=1" size="sm">
              Record a distribution
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Families supported"
          value={formatNumber(stats.families_helped)}
          hint="All time"
          icon={<Users className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Kits delivered"
          value={formatNumber(stats.kits_distributed)}
          hint="All time"
          icon={<Package className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Delivery rounds"
          value={formatNumber(stats.distributions)}
          hint="All time"
          icon={<Truck className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Areas served"
          value={formatNumber(stats.areas_served)}
          hint="All time"
          icon={<PackageOpen className="h-4 w-4" />}
          tone="purple"
        />
      </div>

      {/* ---------------------------------------------------------- kits */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-clay-900">Our kits</h2>

        {kits.length === 0 ? (
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="No kits set up yet"
            description="An administrator defines what a standard kit contains."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {kits.map((kit) => {
              const items = [...(kit.items ?? [])].sort((a, b) => a.position - b.position);

              return (
                <Card key={kit.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{kit.name}</CardTitle>
                        {kit.description && <p className="mt-1 text-sm text-clay-600">{kit.description}</p>}
                      </div>
                      {Number(kit.estimated_cost) > 0 && isAdmin && (
                        <Badge tone="neutral">{formatCurrency(kit.estimated_cost)}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody>
                    <ul className="divide-y divide-clay-200">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                          <span className="text-sm text-clay-800">{item.item_name}</span>
                          <span className="text-sm font-medium tabular-nums text-clay-600">
                            {Number(item.quantity) % 1 === 0 ? Number(item.quantity) : item.quantity} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------- beneficiaries */}
      <section id="beneficiaries" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-clay-900">Families who received ration</h2>
          {isAdmin && (
            <ButtonLink href="/admin/distributions" variant="secondary" size="sm">
              Manage records
            </ButtonLink>
          )}
        </div>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
          These are real families. Their names and areas are shared with members so the work stays open to the
          people funding it — please treat them with the same discretion you would want, and keep them off the
          public feed. Phone numbers and addresses are never shown here.
        </p>

        <Suspense fallback={<Skeleton className="h-20 w-full rounded-2xl" />}>
          <RangeFilter activeKey={range.key} from={range.from} to={range.to} anchorId="beneficiaries" />
        </Suspense>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Families helped" value={formatNumber(rangeSummary.families)} hint={range.label} tone="green" />
          <StatCard label="Kits delivered" value={formatNumber(rangeSummary.kits)} hint={range.label} tone="blue" />
          <StatCard label="Delivery rounds" value={formatNumber(rangeSummary.rounds)} hint={range.label} tone="amber" />
          <StatCard label="Areas reached" value={formatNumber(rangeSummary.areas)} hint={range.label} tone="purple" />
        </div>

        <BeneficiaryList rows={distributions.rows} rangeLabel={range.label} />

        {distributions.total > distributions.rows.length && (
          <p className="text-sm text-clay-600">
            Showing the {distributions.rows.length} most recent of {formatNumber(distributions.total)} records in
            this period. Narrow the dates to see the rest.
          </p>
        )}
      </section>
    </div>
  );
}
