'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { deleteDistributionAction, saveDistributionAction } from '@/lib/actions/ration';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';
import type { FormState } from '@/lib/validation';

export interface DistributionOption {
  id: string;
  label: string;
}

export interface DistributionView {
  id: string;
  beneficiary_id: string;
  kit_id: string;
  quantity: number;
  distributed_on: string;
  distributed_by: string | null;
  notes: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Fields({
  state,
  beneficiaries,
  kits,
  volunteers,
  distribution,
}: {
  state: FormState;
  beneficiaries: DistributionOption[];
  kits: DistributionOption[];
  volunteers: DistributionOption[];
  distribution?: DistributionView;
}) {
  return (
    <>
      {distribution && <input type="hidden" name="id" value={distribution.id} />}

      <FormField label="Family" htmlFor="d-beneficiary" required errors={state.errors?.beneficiary_id}>
        <Select id="d-beneficiary" name="beneficiary_id" defaultValue={distribution?.beneficiary_id ?? ''} required>
          <option value="">Choose a family…</option>
          {beneficiaries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Kit" htmlFor="d-kit" required errors={state.errors?.kit_id}>
          <Select id="d-kit" name="kit_id" defaultValue={distribution?.kit_id ?? ''} required>
            <option value="">Choose a kit…</option>
            {kits.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="How many kits" htmlFor="d-quantity" required errors={state.errors?.quantity}>
          <Input
            id="d-quantity"
            name="quantity"
            type="number"
            min={1}
            max={500}
            defaultValue={distribution?.quantity ?? 1}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date delivered" htmlFor="d-date" required errors={state.errors?.distributed_on}>
          <Input
            id="d-date"
            name="distributed_on"
            type="date"
            defaultValue={distribution?.distributed_on ?? today()}
            max={today()}
            required
          />
        </FormField>

        <FormField
          label="Delivered by"
          htmlFor="d-by"
          help="Points are credited to this volunteer."
          errors={state.errors?.distributed_by}
        >
          <Select id="d-by" name="distributed_by" defaultValue={distribution?.distributed_by ?? ''}>
            <option value="">Me</option>
            {volunteers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Notes" htmlFor="d-notes" errors={state.errors?.notes}>
        <Textarea id="d-notes" name="notes" rows={2} defaultValue={distribution?.notes ?? ''} maxLength={1000} />
      </FormField>

      <FormField
        label="Proof of delivery"
        htmlFor="d-proof"
        help="Optional. Stored privately and only ever served through a short-lived signed link."
        errors={state.errors?.proof}
      >
        <input
          id="d-proof"
          name="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full text-sm text-clay-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cream-50 hover:file:bg-brand-800"
        />
      </FormField>
    </>
  );
}

export function NewDistributionButton({
  beneficiaries,
  kits,
  volunteers,
  openOnMount,
}: {
  beneficiaries: DistributionOption[];
  kits: DistributionOption[];
  volunteers: DistributionOption[];
  openOnMount?: boolean;
}) {
  return (
    <FormModal
      action={saveDistributionAction}
      title="Record a distribution"
      description="Log what was delivered, to whom, and by whom."
      trigger={<AddTrigger label="Record distribution" />}
      submitLabel="Save record"
      openOnMount={openOnMount}
    >
      {(state) => <Fields state={state} beneficiaries={beneficiaries} kits={kits} volunteers={volunteers} />}
    </FormModal>
  );
}

export function EditDistributionButton({
  distribution,
  beneficiaries,
  kits,
  volunteers,
}: {
  distribution: DistributionView;
  beneficiaries: DistributionOption[];
  kits: DistributionOption[];
  volunteers: DistributionOption[];
}) {
  return (
    <FormModal
      action={saveDistributionAction}
      title="Edit distribution"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Edit</span>
        </>
      }
      triggerVariant="ghost"
      submitLabel="Save changes"
    >
      {(state) => (
        <Fields
          state={state}
          beneficiaries={beneficiaries}
          kits={kits}
          volunteers={volunteers}
          distribution={distribution}
        />
      )}
    </FormModal>
  );
}

export function DeleteDistributionButton({ id }: { id: string }) {
  return (
    <DeleteButton
      action={() => deleteDistributionAction(id)}
      title="Delete this distribution record?"
      description="The points credited for it will be removed too, so the ledger stays consistent."
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}
