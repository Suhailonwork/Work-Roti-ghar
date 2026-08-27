import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Distribution records for the member-facing views.
 *
 * Beneficiaries carry `phone` and `address`, and RLS cannot restrict single
 * columns — so the safeguard is here: these queries select name, area and
 * family size and nothing else. Proof images are left out too; the `proofs`
 * bucket stays readable by administrators only, so a path would be dead weight.
 */

export interface DistributionRecord {
  id: string;
  quantity: number;
  distributed_on: string;
  notes: string | null;
  beneficiary: { id: string; name: string; area: string | null; family_size: number } | null;
  kit: { id: string; name: string } | null;
  volunteer: { id: string; full_name: string; avatar_url: string | null } | null;
}

/** Supabase returns an embedded row as an object or a one-element array. */
function pick<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] as T) : (value as T)) ?? null;
}

const SELECT =
  'id, quantity, distributed_on, notes,' +
  ' beneficiary:beneficiaries(id, name, area, family_size),' +
  ' kit:ration_kits(id, name),' +
  ' volunteer:profiles!distributions_distributed_by_fkey(id, full_name, avatar_url)';

export async function getDistributionsInRange({
  from,
  to,
  page = 1,
  pageSize = 25,
}: {
  from: string | null;
  to: string | null;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: DistributionRecord[]; total: number }> {
  const supabase = await createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase.from('distributions').select(SELECT, { count: 'exact' });

  // Both bounds are inclusive: a family served on the last day of the range is
  // part of that range.
  if (from) query = query.gte('distributed_on', from);
  if (to) query = query.lte('distributed_on', to);

  const { data, count } = await query
    .order('distributed_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    quantity: Number(row.quantity) || 0,
    distributed_on: row.distributed_on as string,
    notes: (row.notes as string | null) ?? null,
    beneficiary: pick<DistributionRecord['beneficiary']>(row.beneficiary),
    kit: pick<DistributionRecord['kit']>(row.kit),
    volunteer: pick<DistributionRecord['volunteer']>(row.volunteer),
  })) as DistributionRecord[];

  return { rows, total: count ?? 0 };
}

export interface RationRangeSummary {
  families: number;
  kits: number;
  rounds: number;
  areas: number;
}

/**
 * Headline counts for one range.
 *
 * `families` counts distinct beneficiaries, not rows — a family that received
 * ration twice in the window is one family helped, two rounds.
 */
export async function getRationSummaryInRange({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}): Promise<RationRangeSummary> {
  const supabase = await createClient();

  let query = supabase
    .from('distributions')
    .select('beneficiary_id, quantity, beneficiary:beneficiaries(area)');

  if (from) query = query.gte('distributed_on', from);
  if (to) query = query.lte('distributed_on', to);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const families = new Set<string>();
  const areas = new Set<string>();
  let kits = 0;

  for (const row of rows) {
    families.add(row.beneficiary_id as string);
    kits += Number(row.quantity) || 0;

    const area = pick<{ area: string | null }>(row.beneficiary)?.area;
    if (area) areas.add(area);
  }

  return { families: families.size, kits, rounds: rows.length, areas: areas.size };
}
