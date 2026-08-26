import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FileCheck2, Truck } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signedUrls } from '@/lib/storage';
import {
  DeleteDistributionButton,
  EditDistributionButton,
  NewDistributionButton,
  type DistributionOption,
} from '@/components/admin/DistributionForm';
import { EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Distributions', path: '/admin/distributions', noIndex: true });
}

export default async function DistributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; new?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [listResult, beneficiariesResult, kitsResult, volunteersResult] = await Promise.all([
    supabase
      .from('distributions')
      .select(
        'id, beneficiary_id, kit_id, quantity, distributed_on, distributed_by, notes, proof_bucket, proof_path, beneficiary:beneficiaries(name, area), kit:ration_kits(name), volunteer:profiles!distributions_distributed_by_fkey(full_name)',
        { count: 'exact' },
      )
      .order('distributed_on', { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase.from('beneficiaries').select('id, name, area').eq('status', 'active').order('name').limit(500),
    supabase.from('ration_kits').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active')
      .in('role', ['admin', 'volunteer'])
      .order('full_name')
      .limit(200),
  ]);

  const rows = (listResult.data ?? []) as unknown as Record<string, unknown>[];

  // Proof files live in a private bucket — sign them for this render only.
  const proofPaths = rows
    .map((row) => row.proof_path as string | null)
    .filter((path): path is string => Boolean(path));
  const proofUrls = await signedUrls(supabase, 'proofs', proofPaths, 60 * 10);

  const beneficiaries: DistributionOption[] = (beneficiariesResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.area ? `${row.name} — ${row.area}` : row.name,
  }));

  const kits: DistributionOption[] = (kitsResult.data ?? []).map((row) => ({ id: row.id, label: row.name }));

  const volunteers: DistributionOption[] = (volunteersResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name,
  }));

  const canRecord = beneficiaries.length > 0 && kits.length > 0;

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Distributions"
        description="Every kit that reached a family. Recording one credits the volunteer who delivered it."
        action={
          canRecord ? (
            <NewDistributionButton
              beneficiaries={beneficiaries}
              kits={kits}
              volunteers={volunteers}
              openOnMount={params.new === '1'}
            />
          ) : undefined
        }
      />

      {!canRecord && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You need at least one active family and one active kit before a distribution can be recorded.
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          title="Nothing recorded yet"
          description="Log deliveries as they happen so the impact figures stay honest."
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Family</TH>
              <TH>Kit</TH>
              <TH align="center">Qty</TH>
              <TH>Delivered</TH>
              <TH>By</TH>
              <TH align="center">Proof</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7} message="Nothing here." />
              ) : (
                rows.map((row) => {
                  const beneficiary = pick<{ name: string; area: string | null }>(row.beneficiary);
                  const kit = pick<{ name: string }>(row.kit);
                  const volunteer = pick<{ full_name: string }>(row.volunteer);
                  const proofUrl = row.proof_path ? proofUrls[row.proof_path as string] : null;

                  return (
                    <TR key={row.id as string}>
                      <TD>
                        <p className="font-medium text-clay-900">{beneficiary?.name ?? 'Unknown'}</p>
                        {beneficiary?.area && <p className="text-xs text-clay-500">{beneficiary.area}</p>}
                      </TD>
                      <TD className="text-clay-700">{kit?.name ?? '—'}</TD>
                      <TD align="center" className="tabular-nums">
                        {row.quantity as number}
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(row.distributed_on as string)}</TD>
                      <TD className="text-clay-600">{volunteer?.full_name ?? '—'}</TD>
                      <TD align="center">
                        {proofUrl ? (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-clay-400">—</span>
                        )}
                      </TD>
                      <TD align="right">
                        <div className="flex justify-end gap-1">
                          <EditDistributionButton
                            distribution={{
                              id: row.id as string,
                              beneficiary_id: row.beneficiary_id as string,
                              kit_id: row.kit_id as string,
                              quantity: row.quantity as number,
                              distributed_on: row.distributed_on as string,
                              distributed_by: (row.distributed_by as string) ?? null,
                              notes: (row.notes as string) ?? null,
                            }}
                            beneficiaries={beneficiaries}
                            kits={kits}
                            volunteers={volunteers}
                          />
                          <DeleteDistributionButton id={row.id as string} />
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </TableWrap>

          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={listResult.count ?? 0} />
          </Suspense>
        </>
      )}
    </div>
  );
}

function pick<T>(value: unknown): T | null {
  if (!value) return null;
  return (Array.isArray(value) ? (value[0] as T) : (value as T)) ?? null;
}
