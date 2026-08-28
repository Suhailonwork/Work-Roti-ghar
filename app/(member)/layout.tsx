import type { Metadata } from 'next';

/**
 * Private area. robots.txt already disallows these paths, but a crawler that
 * reaches one anyway (a shared link, a stray backlink) must not index it —
 * member pages in the index would only dilute the Workrotighar brand results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

import { requireApproved } from '@/lib/auth';
import { MemberShell } from '@/components/member/MemberShell';

/**
 * Every route inside this group requires an approved account. Middleware
 * redirects unapproved users first; this is the server-side backstop, and RLS
 * is the one after that.
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireApproved();
  return <MemberShell user={user}>{children}</MemberShell>;
}
