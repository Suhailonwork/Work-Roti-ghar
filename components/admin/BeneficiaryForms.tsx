'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { saveBeneficiaryAction, deleteBeneficiaryAction } from '@/lib/actions/ration';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';
import type { Beneficiary } from '@/types/database';
import type { FormState } from '@/lib/validation';

function Fields({ state, beneficiary }: { state: FormState; beneficiary?: Beneficiary }) {
  return (
    <>
      {beneficiary && <input type="hidden" name="id" value={beneficiary.id} />}

      <FormField label="Family or head of household" htmlFor="b-name" required errors={state.errors?.name}>
        <Input id="b-name" name="name" defaultValue={beneficiary?.name} required maxLength={160} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="b-phone" errors={state.errors?.phone}>
          <Input id="b-phone" name="phone" type="tel" defaultValue={beneficiary?.phone ?? ''} maxLength={20} />
        </FormField>

        <FormField label="Household size" htmlFor="b-size" required errors={state.errors?.family_size}>
          <Input
            id="b-size"
            name="family_size"
            type="number"
            min={1}
            max={60}
            defaultValue={beneficiary?.family_size ?? 5}
            required
          />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="b-address" errors={state.errors?.address}>
        <Textarea id="b-address" name="address" rows={2} defaultValue={beneficiary?.address ?? ''} maxLength={500} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Area"
          htmlFor="b-area"
          help="Used for the areas-served figure."
          errors={state.errors?.area}
        >
          <Input id="b-area" name="area" defaultValue={beneficiary?.area ?? ''} maxLength={120} />
        </FormField>

        <FormField label="Status" htmlFor="b-status" errors={state.errors?.status}>
          <Select id="b-status" name="status" defaultValue={beneficiary?.status ?? 'active'}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>
      </div>

      <FormField
        label="Notes"
        htmlFor="b-notes"
        help="Kept private. Visible to volunteers and administrators only."
        errors={state.errors?.notes}
      >
        <Textarea id="b-notes" name="notes" rows={3} defaultValue={beneficiary?.notes ?? ''} maxLength={1000} />
      </FormField>
    </>
  );
}

export function NewBeneficiaryButton({ openOnMount }: { openOnMount?: boolean }) {
  return (
    <FormModal
      action={saveBeneficiaryAction}
      title="Add a family"
      description="These records are confidential. Only volunteers and administrators can see them."
      trigger={<AddTrigger label="Add family" />}
      submitLabel="Save family"
      openOnMount={openOnMount}
    >
      {(state) => <Fields state={state} />}
    </FormModal>
  );
}

export function EditBeneficiaryButton({ beneficiary }: { beneficiary: Beneficiary }) {
  return (
    <FormModal
      action={saveBeneficiaryAction}
      title="Edit family record"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Edit</span>
        </>
      }
      triggerVariant="ghost"
      submitLabel="Save changes"
    >
      {(state) => <Fields state={state} beneficiary={beneficiary} />}
    </FormModal>
  );
}

export function DeleteBeneficiaryButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteButton
      action={() => deleteBeneficiaryAction(id)}
      title="Delete this family record?"
      description={`"${name}" will be removed permanently. If they have distribution history the record is protected — archive it instead.`}
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}
