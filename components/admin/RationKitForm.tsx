'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { deleteRationKitAction, saveRationKitAction } from '@/lib/actions/ration';
import { FormField, Input, Textarea } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { AddTrigger, FormModal } from './FormModal';
import { DeleteButton } from './DeleteButton';
import type { FormState } from '@/lib/validation';

export interface KitItem {
  item_name: string;
  quantity: number | string;
  unit: string;
}

export interface KitView {
  id: string;
  name: string;
  description: string | null;
  estimated_cost: number;
  is_active: boolean;
  items: KitItem[];
}

const UNITS = ['KG', 'G', 'L', 'ML', 'Packet', 'Piece', 'Dozen'];

const BLANK: KitItem = { item_name: '', quantity: '', unit: 'KG' };

/**
 * The item rows are a small controlled list submitted as parallel
 * `item_name` / `item_quantity` / `item_unit` fields — the server zips them
 * back together and validates each row.
 */
function ItemRows({ initial }: { initial: KitItem[] }) {
  const [items, setItems] = useState<KitItem[]>(initial.length ? initial : [{ ...BLANK }]);

  function update(index: number, patch: Partial<KitItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-clay-800">
          What goes in the kit <span className="text-red-600">*</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setItems((c) => [...c, { ...BLANK }])}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add item
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <Input
              name="item_name"
              value={item.item_name}
              onChange={(e) => update(index, { item_name: e.target.value })}
              placeholder="Rice"
              aria-label={`Item ${index + 1} name`}
              className="flex-1"
              maxLength={120}
            />
            <Input
              name="item_quantity"
              type="number"
              step="0.01"
              min="0.01"
              value={item.quantity}
              onChange={(e) => update(index, { quantity: e.target.value })}
              placeholder="10"
              aria-label={`Item ${index + 1} quantity`}
              className="w-24"
            />
            <select
              name="item_unit"
              value={item.unit}
              onChange={(e) => update(index, { unit: e.target.value })}
              aria-label={`Item ${index + 1} unit`}
              className="h-11 w-24 rounded-xl border border-clay-200 bg-white px-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setItems((c) => (c.length === 1 ? c : c.filter((_, i) => i !== index)))}
              disabled={items.length === 1}
              aria-label={`Remove item ${index + 1}`}
              className="rounded-lg px-2 text-clay-400 hover:bg-clay-100 hover:text-red-700 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fields({ state, kit }: { state: FormState; kit?: KitView }) {
  return (
    <>
      {kit && <input type="hidden" name="id" value={kit.id} />}

      <FormField label="Kit name" htmlFor="k-name" required errors={state.errors?.name}>
        <Input id="k-name" name="name" defaultValue={kit?.name} required maxLength={160} placeholder="Standard Monthly Ration Kit" />
      </FormField>

      <FormField label="Description" htmlFor="k-description" errors={state.errors?.description}>
        <Textarea id="k-description" name="description" rows={2} defaultValue={kit?.description ?? ''} maxLength={1000} />
      </FormField>

      <ItemRows initial={kit?.items ?? []} />
      {state.errors?.items && <p className="text-sm text-red-700">{state.errors.items[0]}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Estimated cost"
          htmlFor="k-cost"
          help="Roughly what one kit costs to assemble."
          errors={state.errors?.estimated_cost}
        >
          <Input
            id="k-cost"
            name="estimated_cost"
            type="number"
            min="0"
            step="1"
            defaultValue={kit?.estimated_cost ?? 0}
          />
        </FormField>

        <div className="flex items-end pb-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-clay-800">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={kit ? kit.is_active : true}
              className="h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
            />
            Available for distribution
          </label>
        </div>
      </div>
    </>
  );
}

export function NewKitButton() {
  return (
    <FormModal
      action={saveRationKitAction}
      title="Create a ration kit"
      description="Define what a standard kit contains. Distributions are recorded against a kit."
      trigger={<AddTrigger label="New kit" />}
      submitLabel="Create kit"
      size="lg"
    >
      {(state) => <Fields state={state} />}
    </FormModal>
  );
}

export function EditKitButton({ kit }: { kit: KitView }) {
  return (
    <FormModal
      action={saveRationKitAction}
      title="Edit ration kit"
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </>
      }
      triggerVariant="secondary"
      submitLabel="Save changes"
      size="lg"
    >
      {(state) => <Fields state={state} kit={kit} />}
    </FormModal>
  );
}

export function DeleteKitButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteButton
      action={() => deleteRationKitAction(id)}
      title="Delete this kit?"
      description={`"${name}" will be removed. If it has already been distributed the record is protected — mark it inactive instead.`}
      icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
      label="Delete"
    />
  );
}
