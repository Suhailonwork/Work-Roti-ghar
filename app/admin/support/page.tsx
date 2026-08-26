import type { Metadata } from 'next';
import { HandHeart } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getSupportSettings } from '@/lib/cms/queries';
import { PledgeStatusSelect } from '@/components/admin/SupportPledgeControls';
import { Badge, EmptyState, SectionHeading } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { buildStaticMetadata } from '@/lib/seo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SupportPledge } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Support offers', path: '/admin/support', noIndex: true });
}

const KIND_LABEL: Record<string, string> = {
  time: 'Their time',
  in_kind: 'Goods',
  transport: 'Transport',
  storage: 'Storage',
  referral: 'A referral',
  financial: 'Financial',
  other: 'Other',
};

export default async function AdminSupportPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data }, support] = await Promise.all([
    supabase.from('support_pledges').select('*').order('created_at', { ascending: false }).limit(120),
    getSupportSettings(),
  ]);

  const pledges = (data ?? []) as SupportPledge[];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Support offers"
        description="What people have offered through the public Support page."
      />

      <div className="rounded-xl border border-clay-200 bg-cream-50 px-4 py-3 text-sm leading-relaxed text-clay-600">
        Public payments are currently{' '}
        <strong className={support.public_payments_enabled ? 'text-amber-800' : 'text-brand-800'}>
          {support.public_payments_enabled ? 'enabled' : 'disabled'}
        </strong>
        . Change this under Settings → Support &amp; funding policy.
      </div>

      {pledges.length === 0 ? (
        <EmptyState
          icon={<HandHeart className="h-5 w-5" />}
          title="No offers yet"
          description="Offers submitted from the public Support page appear here."
        />
      ) : (
        <TableWrap>
          <THead>
            <TH>Who</TH>
            <TH>Offering</TH>
            <TH>Message</TH>
            <TH>Received</TH>
            <TH align="right">Status</TH>
          </THead>
          <TBody>
            {pledges.map((pledge) => (
              <TR key={pledge.id}>
                <TD>
                  <p className="font-medium text-clay-900">{pledge.name}</p>
                  <p className="text-xs text-clay-500">
                    {[pledge.email, pledge.phone].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </TD>
                <TD>
                  <Badge tone={pledge.kind === 'financial' ? 'amber' : 'green'}>
                    {KIND_LABEL[pledge.kind] ?? pledge.kind}
                  </Badge>
                  {pledge.amount != null && (
                    <span className="ml-2 text-sm tabular-nums text-clay-700">
                      {formatCurrency(pledge.amount)}
                    </span>
                  )}
                </TD>
                <TD className="max-w-sm text-clay-700">{pledge.message ?? '—'}</TD>
                <TD className="whitespace-nowrap text-xs text-clay-600">{formatDate(pledge.created_at)}</TD>
                <TD align="right">
                  <div className="flex justify-end">
                    <PledgeStatusSelect id={pledge.id} status={pledge.status} />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </TableWrap>
      )}
    </div>
  );
}
