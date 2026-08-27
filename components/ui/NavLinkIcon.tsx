'use client';

import { useLinkStatus } from 'next/link';
import { Loader2, type LucideIcon } from 'lucide-react';

/**
 * A nav item's icon that turns into a spinner while its route loads.
 *
 * Swapping in place rather than adding a spinner alongside keeps the row from
 * reflowing, so the only thing that changes is the glyph. Must be rendered
 * inside the `<Link>` it reports on — `useLinkStatus` reads the nearest one.
 *
 * `pending` stays false for a prefetched route, so instant navigations never
 * flash a spinner.
 */
export function NavLinkIcon({
  icon: Icon,
  size = 18,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  const Glyph = pending ? Loader2 : Icon;

  return (
    <Glyph
      style={{ width: size, height: size }}
      className={pending ? `${className ?? ''} animate-spin`.trim() : className}
      aria-hidden
    />
  );
}
