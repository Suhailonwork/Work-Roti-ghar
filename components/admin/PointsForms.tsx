'use client';

import { Sparkles } from 'lucide-react';
import { adjustPointsAction, setMemberOfMonthAction } from '@/lib/actions/members';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { AddTrigger, FormModal } from './FormModal';
import type { FormState } from '@/lib/validation';

export interface MemberChoice {
  id: string;
  label: string;
}

export function AdjustPointsButton({ members }: { members: MemberChoice[] }) {
  return (
    <FormModal
      action={adjustPointsAction}
      title="Award or deduct points"
      description="Every adjustment is recorded in the member's ledger and in the audit log."
      trigger={<AddTrigger label="Adjust points" />}
      submitLabel="Save adjustment"
    >
      {(state: FormState) => (
        <>
          <FormField label="Member" htmlFor="pt-member" required errors={state.errors?.profile_id}>
            <Select id="pt-member" name="profile_id" required defaultValue="">
              <option value="">Choose a member…</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Points"
              htmlFor="pt-points"
              required
              help="Use a negative number to deduct."
              errors={state.errors?.points}
            >
              <Input id="pt-points" name="points" type="number" required placeholder="10" />
            </FormField>

            <FormField label="Category" htmlFor="pt-category" errors={state.errors?.category}>
              <Select id="pt-category" name="category" defaultValue="admin">
                <option value="volunteer">Volunteering</option>
                <option value="contribution">Contribution</option>
                <option value="activity">General activity</option>
                <option value="admin">Administrative</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Reason"
            htmlFor="pt-reason"
            required
            help="Shown to the member on their profile."
            errors={state.errors?.reason}
          >
            <Input id="pt-reason" name="reason" required maxLength={200} placeholder="Led the Ramadan packing day" />
          </FormField>
        </>
      )}
    </FormModal>
  );
}

export function MemberOfMonthButton({ members }: { members: MemberChoice[] }) {
  const now = new Date();

  return (
    <FormModal
      action={setMemberOfMonthAction}
      title="Choose the member of the month"
      description="One per calendar month. Choosing again for the same month replaces the previous choice."
      trigger={
        <>
          <Sparkles className="h-4 w-4" aria-hidden />
          Member of the month
        </>
      }
      triggerVariant="secondary"
      submitLabel="Save selection"
    >
      {(state: FormState) => (
        <>
          <FormField label="Member" htmlFor="mom-member" required errors={state.errors?.profile_id}>
            <Select id="mom-member" name="profile_id" required defaultValue="">
              <option value="">Choose a member…</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Month" htmlFor="mom-month" required errors={state.errors?.month}>
              <Select id="mom-month" name="month" defaultValue={String(now.getMonth() + 1)}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Year" htmlFor="mom-year" required errors={state.errors?.year}>
              <Input
                id="mom-year"
                name="year"
                type="number"
                min={2000}
                max={2200}
                defaultValue={now.getFullYear()}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Citation"
            htmlFor="mom-citation"
            help="A sentence about why. Shown on the leaderboard and the dashboard."
            errors={state.errors?.citation}
          >
            <Textarea id="mom-citation" name="citation" rows={3} maxLength={500} />
          </FormField>
        </>
      )}
    </FormModal>
  );
}

