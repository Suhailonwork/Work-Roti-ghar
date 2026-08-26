import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  DeleteReminderButton,
  EditReminderButton,
  NewReminderButton,
  SendReminderButton,
  type MemberChoice,
} from '@/components/admin/ReminderForms';
import { Badge, EmptyState, SectionHeading } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/utils';
import type { PriorityLevel, Reminder, ReminderStatus } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Reminders', path: '/admin/reminders', noIndex: true });
}

const PRIORITY_TONE: Record<PriorityLevel, 'red' | 'amber' | 'green' | 'neutral'> = {
  urgent: 'red',
  high: 'amber',
  normal: 'green',
  low: 'neutral',
};

const STATUS_TONE: Record<ReminderStatus, 'green' | 'amber' | 'blue' | 'neutral'> = {
  sent: 'green',
  draft: 'amber',
  scheduled: 'blue',
  archived: 'neutral',
};

export default async function AdminRemindersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [remindersResult, membersResult] = await Promise.all([
    supabase.from('reminders').select('*').order('created_at', { ascending: false }).limit(60),
    supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name').limit(500),
  ]);

  const reminders = (remindersResult.data ?? []) as Reminder[];
  const members: MemberChoice[] = (membersResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name,
  }));

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Reminders"
        description="Nudges before packing days and delivery rounds. Members see them in the app and get a notification."
        action={<NewReminderButton members={members} />}
      />

      {reminders.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="No reminders yet"
          description="Send one before the next round so nobody has to be chased individually."
          action={<NewReminderButton members={members} />}
        />
      ) : (
        <TableWrap>
          <THead>
            <TH>Reminder</TH>
            <TH>Audience</TH>
            <TH>Priority</TH>
            <TH>Due</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {reminders.map((reminder) => (
              <TR key={reminder.id}>
                <TD>
                  <p className="font-medium text-clay-900">{reminder.title}</p>
                  {reminder.body && (
                    <p className="max-w-sm truncate text-xs text-clay-500">{reminder.body}</p>
                  )}
                </TD>
                <TD className="capitalize text-clay-600">{reminder.audience}</TD>
                <TD>
                  <Badge tone={PRIORITY_TONE[reminder.priority]}>{reminder.priority}</Badge>
                </TD>
                <TD className="whitespace-nowrap text-xs text-clay-600">
                  {reminder.due_at ? formatDateTime(reminder.due_at) : '—'}
                </TD>
                <TD>
                  <Badge tone={STATUS_TONE[reminder.status]}>{reminder.status}</Badge>
                </TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1">
                    {reminder.status !== 'sent' && <SendReminderButton id={reminder.id} />}
                    <EditReminderButton reminder={reminder} members={members} />
                    <DeleteReminderButton id={reminder.id} title={reminder.title} />
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
