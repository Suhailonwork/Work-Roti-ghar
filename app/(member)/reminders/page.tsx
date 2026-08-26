import type { Metadata } from 'next';
import { BellRing, CalendarClock } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { markReminderReadAction } from '@/lib/actions/reminders';
import { Badge, Card, CardBody, EmptyState, SectionHeading } from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { buildStaticMetadata } from '@/lib/seo';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import type { PriorityLevel } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Reminders', path: '/reminders', noIndex: true });
}

const PRIORITY_TONE: Record<PriorityLevel, 'red' | 'amber' | 'green' | 'neutral'> = {
  urgent: 'red',
  high: 'amber',
  normal: 'green',
  low: 'neutral',
};

interface Row {
  id: string;
  is_read: boolean;
  created_at: string;
  reminder: {
    id: string;
    title: string;
    body: string | null;
    due_at: string | null;
    priority: PriorityLevel;
    sent_at: string | null;
  } | null;
}

export default async function RemindersPage() {
  const user = await requireApproved('/reminders');
  const supabase = await createClient();

  const { data } = await supabase
    .from('reminder_recipients')
    .select('id, is_read, created_at, reminder:reminders(id, title, body, due_at, priority, sent_at)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    is_read: row.is_read as boolean,
    created_at: row.created_at as string,
    reminder: (Array.isArray(row.reminder) ? row.reminder[0] : row.reminder) ?? null,
  })) as Row[];

  const unread = rows.filter((row) => !row.is_read);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeading
        title="Reminders"
        description={
          unread.length
            ? `${unread.length} still needing your attention`
            : 'Nothing outstanding — thank you.'
        }
        action={
          user.profile.role === 'admin' ? (
            <ButtonLink href="/admin/reminders" size="sm" variant="secondary">
              Manage reminders
            </ButtonLink>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-5 w-5" />}
          title="No reminders yet"
          description="Administrators send these before packing days and delivery rounds."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            if (!row.reminder) return null;
            const { reminder } = row;

            return (
              <li key={row.id}>
                <Card className={cn(!row.is_read && 'border-brand-300 bg-brand-50/40')}>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-clay-900">{reminder.title}</h2>
                          <Badge tone={PRIORITY_TONE[reminder.priority]}>{reminder.priority}</Badge>
                          {!row.is_read && <Badge tone="blue">New</Badge>}
                        </div>

                        {reminder.body && (
                          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-clay-700">
                            {reminder.body}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-clay-500">
                          {reminder.due_at && (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                              Due {formatDateTime(reminder.due_at)}
                            </span>
                          )}
                          <span>Sent {timeAgo(reminder.sent_at ?? row.created_at)}</span>
                        </div>
                      </div>

                      {!row.is_read && (
                        <form
                          action={async () => {
                            'use server';
                            await markReminderReadAction(row.id);
                          }}
                        >
                          <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
                            Mark as read
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
