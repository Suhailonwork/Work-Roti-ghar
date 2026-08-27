'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  saveOrgSettingsAction,
  savePointsRulesAction,
  saveSeoDefaultsAction,
  saveSupportSettingsAction,
} from '@/lib/actions/settings';
import { FormField, Input, Textarea } from '@/components/ui';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useFormAction, type FormAction } from '@/components/ui/useFormAction';
import { FormMessage } from '@/components/auth/FormMessage';
import type { FormState } from '@/lib/validation';

const initialState: FormState = { ok: false };

/**
 * Settings forms are edit forms: the fields hold the values currently saved, so
 * they are never cleared — not after a rejected save, and not after a good one.
 */
function useSettingsForm(action: FormAction) {
  return useFormAction(action, {
    resetOnSuccess: false,
    initialState,
    onSuccess: (result) => toast.success(result.message ?? 'Saved.'),
  });
}

export function OrgSettingsForm({
  org,
}: {
  org: { name: string; tagline: string; email: string; phone: string; address: string; socials: Record<string, string> };
}) {
  const { state, pending, formProps } = useSettingsForm(saveOrgSettingsAction);

  return (
    <form {...formProps} className="space-y-4">
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Organisation name" htmlFor="o-name" required errors={state.errors?.name}>
          <Input id="o-name" name="name" defaultValue={org.name} required maxLength={120} />
        </FormField>

        <FormField label="Tagline" htmlFor="o-tagline" errors={state.errors?.tagline}>
          <Input id="o-tagline" name="tagline" defaultValue={org.tagline} maxLength={200} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact email" htmlFor="o-email" errors={state.errors?.email}>
          <Input id="o-email" name="email" type="email" defaultValue={org.email} />
        </FormField>

        <FormField label="Contact phone" htmlFor="o-phone" errors={state.errors?.phone}>
          <Input id="o-phone" name="phone" type="tel" defaultValue={org.phone} maxLength={30} />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="o-address" errors={state.errors?.address}>
        <Textarea id="o-address" name="address" rows={2} defaultValue={org.address} maxLength={400} />
      </FormField>

      <fieldset className="grid gap-4 rounded-xl border border-clay-200 bg-cream-100/60 p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-clay-800">Social links</legend>
        <FormField label="Instagram" htmlFor="o-instagram">
          <Input id="o-instagram" name="instagram" defaultValue={org.socials.instagram ?? ''} maxLength={200} />
        </FormField>
        <FormField label="Facebook" htmlFor="o-facebook">
          <Input id="o-facebook" name="facebook" defaultValue={org.socials.facebook ?? ''} maxLength={200} />
        </FormField>
        <FormField label="WhatsApp" htmlFor="o-whatsapp">
          <Input id="o-whatsapp" name="whatsapp" defaultValue={org.socials.whatsapp ?? ''} maxLength={200} />
        </FormField>
        <FormField label="YouTube" htmlFor="o-youtube">
          <Input id="o-youtube" name="youtube" defaultValue={org.socials.youtube ?? ''} maxLength={200} />
        </FormField>
      </fieldset>

      <div className="border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save details
        </SubmitButton>
      </div>
    </form>
  );
}

export function SeoDefaultsForm({
  defaults,
}: {
  defaults: { site_name: string; title: string; description: string; og_image: string; twitter_site: string };
}) {
  const { state, pending, formProps } = useSettingsForm(saveSeoDefaultsAction);

  return (
    <form {...formProps} className="space-y-4">
      <FormMessage state={state} />

      <p className="text-sm leading-relaxed text-clay-600">
        Used for any page that does not set its own metadata, and for the app&rsquo;s own routes.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Site name" htmlFor="d-site" required errors={state.errors?.site_name}>
          <Input id="d-site" name="site_name" defaultValue={defaults.site_name} required maxLength={120} />
        </FormField>

        <FormField label="Twitter handle" htmlFor="d-twitter" help="Including the @." errors={state.errors?.twitter_site}>
          <Input id="d-twitter" name="twitter_site" defaultValue={defaults.twitter_site} maxLength={60} />
        </FormField>
      </div>

      <FormField label="Default page title" htmlFor="d-title" required errors={state.errors?.title}>
        <Input id="d-title" name="title" defaultValue={defaults.title} required maxLength={200} />
      </FormField>

      <FormField label="Default description" htmlFor="d-description" errors={state.errors?.description}>
        <Textarea id="d-description" name="description" rows={3} defaultValue={defaults.description} maxLength={320} />
      </FormField>

      <FormField
        label="Default share image"
        htmlFor="d-og"
        help="Shown when a link to the site is shared. 1200 × 630 works best."
        errors={state.errors?.og_image}
      >
        <Input id="d-og" name="og_image" defaultValue={defaults.og_image} maxLength={500} />
      </FormField>

      <div className="border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save SEO defaults
        </SubmitButton>
      </div>
    </form>
  );
}

export function SupportSettingsForm({
  support,
}: {
  support: { policy_statement: string; public_payments_enabled: boolean; note: string };
}) {
  const { state, pending, formProps } = useSettingsForm(saveSupportSettingsAction);
  const [enabled, setEnabled] = useState(support.public_payments_enabled);

  return (
    <form {...formProps} className="space-y-4">
      <FormMessage state={state} />

      <FormField
        label="Funding policy statement"
        htmlFor="sp-policy"
        required
        help="Shown on the Support page and in the footer of every public page."
        errors={state.errors?.policy_statement}
      >
        <Textarea
          id="sp-policy"
          name="policy_statement"
          rows={3}
          defaultValue={support.policy_statement}
          required
          maxLength={600}
        />
      </FormField>

      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <input
          type="checkbox"
          name="public_payments_enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-clay-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="block text-sm font-medium text-amber-900">Accept financial support from the public</span>
          <span className="mt-1 block text-xs leading-relaxed text-amber-800">
            Off by default, because Roti Ghar&rsquo;s stated policy is that it does not take donations from the
            public. Turn this on only if that policy has actually changed.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            Turning this on adds a financial option to the public support form and records the offer. It does
            <strong> not</strong> process payments. Before taking money from the public, connect a licensed
            payment gateway (Razorpay, Stripe, PayU or similar) and let it handle the transaction — this
            application must never collect card numbers, UPI PINs or banking credentials itself.
          </p>
        </div>
      )}

      <FormField label="Internal note" htmlFor="sp-note" errors={state.errors?.note}>
        <Textarea id="sp-note" name="note" rows={2} defaultValue={support.note} maxLength={600} />
      </FormField>

      <div className="border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save support settings
        </SubmitButton>
      </div>
    </form>
  );
}

export function PointsRulesForm({
  rules,
}: {
  rules: { distribution: number; verified_contribution: number; post: number; volunteer_day: number };
}) {
  const { state, pending, formProps } = useSettingsForm(savePointsRulesAction);

  return (
    <form {...formProps} className="space-y-4">
      <FormMessage state={state} />

      <p className="text-sm leading-relaxed text-clay-600">
        How many points each verified activity is worth. Changing these affects new activity only — points
        already awarded stay as they are.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Per kit distributed"
          htmlFor="pr-distribution"
          errors={state.errors?.distribution}
        >
          <Input
            id="pr-distribution"
            name="distribution"
            type="number"
            min={0}
            max={1000}
            defaultValue={rules.distribution}
          />
        </FormField>

        <FormField
          label="Per verified contribution"
          htmlFor="pr-contribution"
          errors={state.errors?.verified_contribution}
        >
          <Input
            id="pr-contribution"
            name="verified_contribution"
            type="number"
            min={0}
            max={1000}
            defaultValue={rules.verified_contribution}
          />
        </FormField>

        <FormField label="Per post" htmlFor="pr-post" errors={state.errors?.post}>
          <Input id="pr-post" name="post" type="number" min={0} max={1000} defaultValue={rules.post} />
        </FormField>

        <FormField label="Per volunteer day" htmlFor="pr-day" errors={state.errors?.volunteer_day}>
          <Input
            id="pr-day"
            name="volunteer_day"
            type="number"
            min={0}
            max={1000}
            defaultValue={rules.volunteer_day}
          />
        </FormField>
      </div>

      <div className="border-t border-clay-200 pt-4">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          <Save className="h-4 w-4" aria-hidden />
          Save points rules
        </SubmitButton>
      </div>
    </form>
  );
}
