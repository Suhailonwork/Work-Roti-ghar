'use client';

import { useActionState, useState } from 'react';
import { Box, Clock, HandHeart, MapPin, Truck, Wallet } from 'lucide-react';
import { submitSupportPledgeAction } from '@/lib/actions/support';
import { FormField, Input, Select, Textarea } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/auth/FormMessage';
import { cn } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

const KINDS = [
  { value: 'time', label: 'My time', icon: Clock, hint: 'Packing days and delivery runs' },
  { value: 'in_kind', label: 'Goods', icon: Box, hint: 'Rice, flour, oil, packaging' },
  { value: 'transport', label: 'Transport', icon: Truck, hint: 'A vehicle for a delivery round' },
  { value: 'storage', label: 'Storage', icon: MapPin, hint: 'Dry space to hold stock' },
  { value: 'referral', label: 'A referral', icon: HandHeart, hint: 'A family who needs support' },
] as const;

export function SupportForm({
  publicPaymentsEnabled,
  presetAmounts = [],
}: {
  publicPaymentsEnabled: boolean;
  presetAmounts?: number[];
}) {
  const [state, formAction] = useActionState(submitSupportPledgeAction, initialState);
  const [kind, setKind] = useState<string>('time');
  const [amount, setAmount] = useState('');

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-8 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-800">
          <HandHeart className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="font-serif text-xl font-semibold text-brand-900">Thank you</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-clay-700">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <fieldset>
        <legend className="mb-2.5 block text-sm font-medium text-clay-800">What can you offer?</legend>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {KINDS.map((option) => {
            const Icon = option.icon;
            const active = kind === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer flex-col rounded-xl border px-3.5 py-3 transition-colors',
                  active
                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-clay-200 bg-cream-50 hover:border-clay-300',
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={active}
                  onChange={() => setKind(option.value)}
                  className="sr-only"
                />
                <Icon
                  className={cn('mb-1.5 h-4 w-4', active ? 'text-brand-700' : 'text-clay-400')}
                  aria-hidden
                />
                <span className={cn('text-sm font-medium', active ? 'text-brand-900' : 'text-clay-800')}>
                  {option.label}
                </span>
                <span className="mt-0.5 text-xs leading-snug text-clay-500">{option.hint}</span>
              </label>
            );
          })}

          {publicPaymentsEnabled && (
            <label
              className={cn(
                'flex cursor-pointer flex-col rounded-xl border px-3.5 py-3 transition-colors',
                kind === 'financial'
                  ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-clay-200 bg-cream-50 hover:border-clay-300',
              )}
            >
              <input
                type="radio"
                name="kind"
                value="financial"
                checked={kind === 'financial'}
                onChange={() => setKind('financial')}
                className="sr-only"
              />
              <Wallet
                className={cn('mb-1.5 h-4 w-4', kind === 'financial' ? 'text-brand-700' : 'text-clay-400')}
                aria-hidden
              />
              <span className="text-sm font-medium text-clay-800">Financial</span>
              <span className="mt-0.5 text-xs leading-snug text-clay-500">A one-off contribution</span>
            </label>
          )}
        </div>
      </fieldset>

      {/* Amount only exists when the organisation has switched public payments on. */}
      {publicPaymentsEnabled && kind === 'financial' && (
        <FormField label="Amount" htmlFor="amount" errors={state.errors?.amount}>
          <div className="space-y-2.5">
            {presetAmounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      amount === String(preset)
                        ? 'border-brand-600 bg-brand-50 text-brand-800'
                        : 'border-clay-200 bg-cream-50 text-clay-700 hover:border-clay-300',
                    )}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            )}
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Other amount"
            />
          </div>
        </FormField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="support-name" required errors={state.errors?.name}>
          <Input id="support-name" name="name" required autoComplete="name" />
        </FormField>

        <FormField label="Phone" htmlFor="support-phone" errors={state.errors?.phone}>
          <Input id="support-phone" name="phone" type="tel" autoComplete="tel" />
        </FormField>
      </div>

      <FormField
        label="Email"
        htmlFor="support-email"
        help="So we can reply. We will not add you to any list."
        errors={state.errors?.email}
      >
        <Input id="support-email" name="email" type="email" autoComplete="email" />
      </FormField>

      <FormField label="Tell us more" htmlFor="support-message" errors={state.errors?.message}>
        <Textarea
          id="support-message"
          name="message"
          rows={4}
          placeholder="When you are free, what you can bring, or who you would like us to reach."
        />
      </FormField>

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Sending…">
        Send your offer
      </SubmitButton>
    </form>
  );
}
