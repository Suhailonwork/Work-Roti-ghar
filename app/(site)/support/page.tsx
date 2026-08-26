import type { Metadata } from 'next';
import { HandHeart, Info, ShieldCheck } from 'lucide-react';
import { SupportForm } from '@/components/site/SupportForm';
import { getOrgSettings, getSupportSettings } from '@/lib/cms/queries';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({
    title: 'Support our work',
    description:
      'Roti Ghar runs on volunteers and members rather than public donations. Here is what actually helps.',
    path: '/support',
  });
}

export default async function SupportPage() {
  const [support, org] = await Promise.all([getSupportSettings(), getOrgSettings()]);

  return (
    <>
      <section className="bg-gradient-to-b from-cream-200 to-cream-100 py-14 sm:py-18">
        <div className="container-narrow text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-cream-50">
            <HandHeart className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-brand-950 sm:text-4xl">
            Support our work
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-clay-700">
            {support.public_payments_enabled
              ? 'There are several ways to help — and time is still the one we need most.'
              : 'The most useful thing you can give us is not money.'}
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- funding policy */}
      {!support.public_payments_enabled && (
        <section className="container-page pt-10">
          <div className="mx-auto flex max-w-2xl gap-3.5 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 sm:px-6 sm:py-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <h2 className="font-semibold text-brand-900">Our funding policy</h2>
              <p className="mt-1.5 leading-relaxed text-clay-700">{support.policy_statement}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-clay-600">
                So there is no payment form on this page, and nobody from Roti Ghar will ever ask you for a
                bank transfer, a UPI PIN or card details. If someone does, it is not us.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- support form */}
      <section className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">
            Tell us what you can offer
          </h2>
          <p className="mt-2 mb-7 leading-relaxed text-clay-600">
            A morning a month, a sack of rice, a van for an afternoon, dry storage, or the name of a family who
            needs us — all of it counts.
          </p>

          <SupportForm
            publicPaymentsEnabled={support.public_payments_enabled}
            presetAmounts={[500, 1000, 2500, 5000]}
          />
        </div>
      </section>

      {/* -------------------------------------------------- how we account */}
      <section className="border-t border-clay-200 bg-cream-200 py-12 sm:py-16">
        <div className="container-narrow">
          <div className="flex gap-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <h2 className="font-serif text-xl font-semibold text-brand-900">How we account for things</h2>
              <div className="prose-roti mt-3">
                <p>
                  Every contribution and every expense is recorded against a receipt and verified by an
                  administrator before it counts towards our balance. Nothing enters the books on someone&rsquo;s
                  word alone.
                </p>
                <p>
                  Family records are kept private. Only administrators and the volunteers running a delivery can
                  see who received what, and we do not publish photographs that identify a household.
                </p>
                {org.email && (
                  <p>
                    Questions about any of this?{' '}
                    <a href={`mailto:${org.email}`}>{org.email}</a>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
