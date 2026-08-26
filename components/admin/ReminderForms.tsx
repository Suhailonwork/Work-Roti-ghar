'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReminderAction, saveReminderAction, sendReminderAction } from '@/lib/actions/reminders';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';
import type { Reminder, ReminderAudience } from '@/types/database';
import type { FormState } from '@/lib/validation';

export interface MemberChoice {
  id: string;
  label: string;
}

function Fields({
  state,
  members,
  reminder,
}: {
  state: FormState;
  members: MemberChoice[];
  reminder?: Reminder;
}) {
  const [audience, setAudience] = useState<ReminderAudience>(reminder?.audience ?? 'all');

  return (
    <>
      {reminder && <input type="hidden" name="id" value={reminder.id} />}

      <FormField label="Title" htmlFor="r-title" required errors={state.errors?.title}>
        <Input
          id="r-title"
          name="title"
          defaultValue={reminder?.title}
          required
          maxLength={200}
          placeholder="Packing day this Saturday"
        />
      </FormField>

      <FormField label="Message" htmlFor="r-body" errors={state.errors?.body}>
        <Textarea id="r-body" name="body" rows={4} defaultValue={reminder?.body ?? ''} maxLength={2000} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Send to" htmlFor="r-audience" required errors={state.errors?.audience}>
          <Select
            id="r-audience"
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as ReminderAudience)}
          >
            <option value="all">Everyone</option>
            <option value="members">Members only</option>
            <option value="volunteers">Volunteers only</option>
            <option value="admins">Administrators only</option>
            <option value="selected">Specific people</option>
          </Select>
        </FormField>

        <FormField label="Priority" htmlFor="r-priority" errors={state.errors?.priority}>
          <Select id="r-priority" name="priority" defaultValue={reminder?.priority ?? 'normal'}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </FormField>
      </div>

      {audience === 'selected' && (
        <FormField
          label="Who exactly"
          htmlFor="r-people"
          required
          help="Hold Ctrl (or Cmd) to pick more than one."
          errors={state.errors?.profile_ids}
        >
          <select
            id="r-people"
            name="profile_ids"
            multiple
            size={8}
            className="w-full rounded-xl border border-clay-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField
        label="Due"
        htmlFor="r-due"
        help="Optional. Shown to members alongside the reminder."
        errors={state.errors?.due_at}
      >
        <Input
          id="r-due"
          name="due_at"
          type="datetime-local"
          defaultValue={reminder?.due_at ? reminder.due_at.slice(0, 16) : ''}
        />
      </FormField>

      <label className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <input
          type="checkbox"
          name="send_now"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="block text-sm font-medium text-brand-900">Send it now</span>
          <span className="block text-xs leading-relaxed text-clay-600">
            Uncheck to save as a draft and send later.
          </span>
        </span>
      </label>
    </>
  );
}

export function NewReminderButton({ members }: { members: MemberChoice[] }) {
  return (
    <FormModal
      action={saveReminderAction}
      title="New reminder"
      description="Members see reminders in the app and get a notification."
      trigger={<AddTrigger label="New reminder" />}
      submitLabel="Save reminder"
    >
      {(state) => <Fields state={state} members={members} />}
    </FormModal>
  );
}

export function EditReminderButton({ reminder, members }: { reminder: Reminder; members: MemberChoice[] }) {
  return (
    <FormModal
      action={saveReminderAction}
      title="Edit reminder"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Edit</span>
        </>
      }
      triggerVariant="ghost"
      submitLabel="Save changes"
    >
      {(state) => <Fields state={state} members={members} reminder={reminder} />}
    </FormModal>
  );
}

export function SendReminderButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-brand-700 hover:bg-brand-50"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendReminderAction(id);
          if (result.ok) {
            toast.success(result.message ?? 'Sent.');
            router.refresh();
          } else {
            toast.error(result.message ?? 'That did not work.');
          }
        })
      }
    >
      <Send className="h-3.5 w-3.5" aria-hidden />
      Send
    </Button>
  );
}

export function DeleteReminderButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteButton
      action={() => deleteReminderAction(id)}
      title="Delete this reminder?"
      description={`"${title}" and everyone's copy of it will be removed.`}
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}

