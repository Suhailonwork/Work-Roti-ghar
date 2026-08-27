'use client';

import NextLink, { useLinkStatus } from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Marker rendered inside a link whose route is still loading.
 *
 * `useLinkStatus` only reports on the nearest enclosing `<Link>`, so the state
 * cannot be read from outside and turned into a class on the link itself. This
 * writes it into the DOM instead, and `globals.css` picks it up with
 * `a:has([data-link-pending])` — which means the effect lands on the real link
 * element without wrapping the children in anything.
 *
 * That matters: several links in this app are flex rows (avatar + name, icon +
 * label), and an extra wrapper would change their layout. `sr-only` is
 * absolutely positioned, so it is out of flow and never becomes a flex item.
 * Nothing moves by a pixel.
 *
 * It doubles as the accessible announcement — screen readers get "Loading"
 * rather than silence.
 */
function PendingMarker() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span data-link-pending className="sr-only" role="status">
      Loading
    </span>
  );
}

/**
 * `next/link` that shows it is working.
 *
 * A drop-in replacement — imported as `Link` everywhere, so call sites are
 * unchanged. Prefetched routes resolve instantly and never flash, so this only
 * ever appears on a navigation that genuinely has to wait.
 */
export function PendingLink({ children, ...props }: ComponentPropsWithoutRef<typeof NextLink>) {
  return (
    <NextLink {...props}>
      <PendingMarker />
      {children}
    </NextLink>
  );
}
