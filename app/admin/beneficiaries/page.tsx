import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClipboardList, ShieldAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  DeleteBeneficiaryButton,
  EditBeneficiaryButton,
  NewBeneficiaryButton,
} from '@/components/admin/BeneficiaryForms';
import { MemberSearch } from '@/components/members/MemberSearch';
import { Badge, EmptyState, SectionHeading, Skeleton } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import type { Beneficiary, BeneficiaryStatus } from '@/types/database';

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Beneficiaries', path: '/admin/beneficiaries', noIndex: true });
}

const STATUSES: BeneficiaryStatus[] = ['active', 'inactive', 'archived'];
const STATUS_TONE = { active: 'green', inactive: 'amber', archived: 'neutral' } as const;

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; new?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as BeneficiaryStatus)
    ? (params.status as BeneficiaryStatus)
    : undefined;
  const search = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase.from('beneficiaries').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const beneficiaries = (data ?? []) as Beneficiary[];

  const tabs = [
    { label: 'All', href: '/admin/beneficiaries', count: count ?? 0 },
    { label: 'Active', href: '/admin/beneficiaries?status=active' },
    { label: 'Inactive', href: '/admin/beneficiaries?status=inactive' },
    { label: 'Archived', href: '/admin/beneficiaries?status=archived' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Beneficiaries"
        description="The families we deliver to."
        action={<NewBeneficiaryButton openOnMount={params.new === '1'} />}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p className="leading-relaxed">
          These records are confidential. Row level security keeps them out of reach of ordinary members
          entirely — please keep names, phone numbers and addresses off the community feed too.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Tabs items={tabs} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl" />}>
        <MemberSearch basePath="/admin/beneficiaries" />
      </Suspense>

      {beneficiaries.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title={search ? 'No families matched' : 'No families recorded yet'}
          description={
            search
              ? 'Try a different spelling.'
              : 'Add the households you deliver to so distributions can be logged against them.'
          }
          action={<NewBeneficiaryButton />}
        />
      ) : (
        <>
          <TableWrap>
            <THead>
              <TH>Family</TH>
              <TH>Area</TH>
              <TH>Phone</TH>
              <TH align="center">Household</TH>
              <TH>Status</TH>
              <TH align="right">Added</TH>
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {beneficiaries.length === 0 ? (
                <TableEmpty colSpan={7} message="Nothing here." />
              ) : (
                beneficiaries.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <p className="font-medium text-clay-900">{row.name}</p>
                      {row.address && <p className="max-w-xs truncate text-xs text-clay-500">{row.address}</p>}
                    </TD>
                    <TD className="text-clay-600">{row.area ?? '—'}</TD>
                    <TD className="whitespace-nowrap text-clay-600">{row.phone ?? '—'}</TD>
                    <TD align="center" className="tabular-nums">
                      {row.family_size}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                    </TD>
                    <TD align="right" className="whitespace-nowrap text-xs text-clay-500">
                      {formatDate(row.created_at)}
                    </TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        <EditBeneficiaryButton beneficiary={row} />
                        <DeleteBeneficiaryButton id={row.id} name={row.name} />
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </TableWrap>

          <Suspense fallback={null}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
          </Suspense>
        </>
      )}
    </div>
  );
}
