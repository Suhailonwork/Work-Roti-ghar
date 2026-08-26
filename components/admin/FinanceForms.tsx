'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Trash2, Undo2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteContributionAction,
  deleteExpenseAction,
  saveContributionAction,
  saveExpenseAction,
  verifyContributionAction,
  verifyExpenseAction,
} from '@/lib/actions/finance';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';
import type { Contribution, Expense, VerificationStatus } from '@/types/database';
import type { FormState } from '@/lib/validation';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const RECEIPT_HELP =
  'Optional. Stored privately and only ever served through a short-lived signed link.';

/**
 * A note on what these forms deliberately do NOT collect: there is no field for
 * a card number, a CVV, a UPI PIN or a banking password anywhere in the finance
 * module, and no column in the schema to put one in. A receipt image and a
 * transaction reference are the whole record.
 */
function ReceiptField({ errors }: { errors?: string[] }) {
  return (
    <FormField label="Receipt" htmlFor="f-receipt" help={RECEIPT_HELP} errors={errors}>
      <input
        id="f-receipt"
        name="receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="block w-full text-sm text-clay-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cream-50 hover:file:bg-brand-800"
      />
    </FormField>
  );
}

// ------------------------------------------------------------ contributions --
export interface MemberOption {
  id: string;
  label: string;
}

function ContributionFields({
  state,
  members,
  contribution,
}: {
  state: FormState;
  members: MemberOption[];
  contribution?: Contribution;
}) {
  return (
    <>
      {contribution && <input type="hidden" name="id" value={contribution.id} />}

      <FormField label="Contributor name" htmlFor="c-name" required errors={state.errors?.contributor_name}>
        <Input id="c-name" name="contributor_name" defaultValue={contribution?.contributor_name} required maxLength={160} />
      </FormField>

      <FormField
        label="Link to a member"
        htmlFor="c-member"
        help="Optional. Linking credits contribution points once verified."
        errors={state.errors?.contributor_id}
      >
        <Select id="c-member" name="contributor_id" defaultValue={contribution?.contributor_id ?? ''}>
          <option value="">Not linked</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount" htmlFor="c-amount" required errors={state.errors?.amount}>
          <Input
            id="c-amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            defaultValue={contribution?.amount}
            required
          />
        </FormField>

        <FormField label="Date" htmlFor="c-date" required errors={state.errors?.contributed_on}>
          <Input
            id="c-date"
            name="contributed_on"
            type="date"
            defaultValue={contribution?.contributed_on ?? today()}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Payment method" htmlFor="c-method" required errors={state.errors?.payment_method}>
          <Select id="c-method" name="payment_method" defaultValue={contribution?.payment_method ?? 'cash'}>
            <option value="cash">Cash</option>
            <option value="bank transfer">Bank transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="in kind">In kind</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField
          label="Transaction reference"
          htmlFor="c-ref"
          help="The reference printed on the receipt — never a PIN."
          errors={state.errors?.transaction_ref}
        >
          <Input id="c-ref" name="transaction_ref" defaultValue={contribution?.transaction_ref ?? ''} maxLength={120} />
        </FormField>
      </div>

      <FormField label="Purpose" htmlFor="c-purpose" errors={state.errors?.purpose}>
        <Input id="c-purpose" name="purpose" defaultValue={contribution?.purpose ?? ''} maxLength={300} />
      </FormField>

      <FormField label="Notes" htmlFor="c-notes" errors={state.errors?.notes}>
        <Textarea id="c-notes" name="notes" rows={2} defaultValue={contribution?.notes ?? ''} maxLength={1000} />
      </FormField>

      <ReceiptField errors={state.errors?.receipt} />
    </>
  );
}

export function NewContributionButton({ members }: { members: MemberOption[] }) {
  return (
    <FormModal
      action={saveContributionAction}
      title="Record a contribution"
      description="New entries start as unverified and do not affect the balance until you verify them."
      trigger={<AddTrigger label="Record contribution" />}
      submitLabel="Save"
      size="lg"
    >
      {(state) => <ContributionFields state={state} members={members} />}
    </FormModal>
  );
}

export function EditContributionButton({
  contribution,
  members,
}: {
  contribution: Contribution;
  members: MemberOption[];
}) {
  return (
    <FormModal
      action={saveContributionAction}
      title="Edit contribution"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Edit</span>
        </>
      }
      triggerVariant="ghost"
      submitLabel="Save changes"
      size="lg"
    >
      {(state) => <ContributionFields state={state} members={members} contribution={contribution} />}
    </FormModal>
  );
}

export function DeleteContributionButton({ id }: { id: string }) {
  return (
    <DeleteButton
      action={() => deleteContributionAction(id)}
      title="Delete this contribution?"
      description="The record and its receipt will be removed permanently, and any points it earned are withdrawn."
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}

// ----------------------------------------------------------------- expenses --
function ExpenseFields({ state, expense }: { state: FormState; expense?: Expense }) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <FormField label="Description" htmlFor="e-description" required errors={state.errors?.description}>
        <Input id="e-description" name="description" defaultValue={expense?.description} required maxLength={500} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="e-category" required errors={state.errors?.category}>
          <Select id="e-category" name="category" defaultValue={expense?.category ?? 'ration'}>
            <option value="ration">Ration</option>
            <option value="transport">Transport</option>
            <option value="packaging">Packaging</option>
            <option value="storage">Storage</option>
            <option value="utilities">Utilities</option>
            <option value="other">Other</option>
          </Select>
        </FormField>

        <FormField label="Amount" htmlFor="e-amount" required errors={state.errors?.amount}>
          <Input id="e-amount" name="amount" type="number" min="1" step="0.01" defaultValue={expense?.amount} required />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date" htmlFor="e-date" required errors={state.errors?.spent_on}>
          <Input id="e-date" name="spent_on" type="date" defaultValue={expense?.spent_on ?? today()} required />
        </FormField>

        <FormField label="Vendor" htmlFor="e-vendor" errors={state.errors?.vendor}>
          <Input id="e-vendor" name="vendor" defaultValue={expense?.vendor ?? ''} maxLength={160} />
        </FormField>
      </div>

      <ReceiptField errors={state.errors?.receipt} />
    </>
  );
}

export function NewExpenseButton() {
  return (
    <FormModal
      action={saveExpenseAction}
      title="Record an expense"
      description="New entries start as unverified and do not affect the balance until you verify them."
      trigger={<AddTrigger label="Record expense" />}
      submitLabel="Save"
    >
      {(state) => <ExpenseFields state={state} />}
    </FormModal>
  );
}

export function EditExpenseButton({ expense }: { expense: Expense }) {
  return (
    <FormModal
      action={saveExpenseAction}
      title="Edit expense"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Edit</span>
        </>
      }
      triggerVariant="ghost"
      submitLabel="Save changes"
    >
      {(state) => <ExpenseFields state={state} expense={expense} />}
    </FormModal>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <DeleteButton
      action={() => deleteExpenseAction(id)}
      title="Delete this expense?"
      description="The record and its receipt will be removed permanently."
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
    />
  );
}

// ------------------------------------------------------------ verification --
export function VerifyButtons({
  id,
  kind,
  status,
}: {
  id: string;
  kind: 'contribution' | 'expense';
  status: VerificationStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: VerificationStatus) {
    startTransition(async () => {
      const result =
        kind === 'contribution'
          ? await verifyContributionAction(id, next)
          : await verifyExpenseAction(id, next);

      if (result.ok) {
        toast.success(result.message ?? 'Updated.');
        router.refresh();
      } else {
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  if (status === 'pending') {
    return (
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-brand-700 hover:bg-brand-50"
          disabled={pending}
          onClick={() => set('verified')}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Verify
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-700 hover:bg-red-50"
          disabled={pending}
          onClick={() => set('rejected')}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Reject
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => set('pending')}
        title="Move back to pending"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Reopen
      </Button>
    </div>
  );
}
