import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, PackageOpen, Truck, Users } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getImpactStats } from '@/lib/cms/queries';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  SectionHeading,
  StatCard,
} from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Ration', path: '/ration', noIndex: true });
}

export default async function RationPage() {
  const user = await requireApproved('/ration');
  const supabase = await createClient();
  const isVolunteer = user.profile.role === 'admin' || user.profile.role === 'volunteer';

  const [stats, kitsResult, distributionsResult] = await Promise.all([
    getImpactStats(),
    supabase
      .from('ration_kits')
      .select('id, name, description, estimated_cost, is_active, items:ration_kit_items(id, item_name, quantity, unit, position)')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    // Distribution records are restricted to volunteers and admins by RLS;
    // for an ordinary member this query simply returns nothing.
    isVolunteer
      ? supabase
          .from('distributions')
          .select(
            'id, quantity, distributed_on, notes, beneficiary:beneficiaries(id, name, area), kit:ration_kits(id, name), volunteer:profiles!distributions_distributed_by_fkey(id, full_name)',
          )
          .order('distributed_on', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
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
  const distributions = (distributionsResult.data ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Ration"
        description="What goes in a kit, and how many have reached families so far."
        action={
          isVolunteer ? (
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
          icon={<Users className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Kits delivered"
          value={formatNumber(stats.kits_distributed)}
          icon={<Package className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Delivery rounds"
          value={formatNumber(stats.distributions)}
          icon={<Truck className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Areas served"
          value={formatNumber(stats.areas_served)}
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
                      {Number(kit.estimated_cost) > 0 && user.profile.role === 'admin' && (
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

      {/* ------------------------------------------- recent distributions */}
      {isVolunteer && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-clay-900">Recent distributions</h2>
            <Link href="/admin/distributions" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
            Family names and areas below are confidential. They are visible to volunteers and administrators
            only — please do not repeat them in the community feed.
          </p>

          {distributions.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-5 w-5" />}
              title="Nothing recorded yet"
              description="Distributions you record will be listed here."
            />
          ) : (
            <Card>
              <CardBody className="p-0">
                <ul className="divide-y divide-clay-200">
                  {distributions.map((row) => {
                    const beneficiary = pick<{ id: string; name: string; area: string | null }>(row.beneficiary);
                    const kit = pick<{ id: string; name: string }>(row.kit);
                    const volunteer = pick<{ id: string; full_name: string }>(row.volunteer);

                    return (
                      <li key={row.id as string} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-clay-900">{beneficiary?.name ?? 'Unknown family'}</p>
                          <p className="text-xs text-clay-500">
                            {kit?.name ?? 'Kit'} × {row.quantity as number}
                            {beneficiary?.area ? ` · ${beneficiary.area}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-clay-700">{formatDate(row.distributed_on as string)}</p>
                          {volunteer && <p className="text-xs text-clay-500">by {volunteer.full_name}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

/** Supabase returns embedded rows as an object or a single-element array. */
function pick<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] as T) : (value as T)) ?? null;
}
