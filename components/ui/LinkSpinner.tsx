'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';

/**
 * Spinner for a navigation that has not landed yet.
 *
 * `useLinkStatus` reports on the nearest enclosing `<Link>`, so this has to be
 * rendered as a child of one. It stays a tiny client component of its own
 * rather than pushing `Button.tsx` over the client boundary — `ButtonLink` is
 * used from server components all over the app and should keep rendering there.
 *
 * `pending` only goes true for a navigation that actually has to wait on the
 * server. A prefetched route resolves instantly and never shows a spinner,
 * which is the behaviour you want: no flicker on fast links.
 */
export function LinkSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />;
}
