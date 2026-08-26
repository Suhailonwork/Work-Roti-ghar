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
