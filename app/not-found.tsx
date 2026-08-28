import type { Metadata } from 'next';

/** A 404 must never be indexed, but its links back into the site still count. */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-6xl font-semibold text-brand-200">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-brand-900">We could not find that page</h1>
      <p className="mt-2 max-w-md text-clay-600">
        The link may be out of date, or the page may have been unpublished.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to the homepage</ButtonLink>
        <Link href="/support" className="inline-flex h-11 items-center px-4 text-sm font-medium text-brand-800 hover:underline">
          Get in touch
        </Link>
      </div>
    </div>
  );
}
