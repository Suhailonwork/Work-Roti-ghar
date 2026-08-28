import type { Metadata } from 'next';

/**
 * Private area. robots.txt already disallows these paths, but a crawler that
 * reaches one anyway (a shared link, a stray backlink) must not index it —
 * member pages in the index would only dilute the Workrotighar brand results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminMobileNav, AdminSidebar, type AdminBadges } from '@/components/admin/AdminNav';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Avatar } from '@/components/ui';

/**
 * Administrator-only area.
 *
 * Three independent gates stand in front of everything here: middleware
 * redirects non-admins before the route renders, `requireAdmin()` re-checks on
 * the server, and every table these pages touch has an RLS policy requiring
 * `is_admin()`. Removing any one of them would still leave the data protected.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const [applications, contributions, expenses, reports, support] = await Promise.all([
    supabase.from('member_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('support_pledges').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);

  const badges: AdminBadges = {
    applications: applications.count ?? 0,
    contributions: contributions.count ?? 0,
    expenses: expenses.count ?? 0,
    reports: reports.count ?? 0,
    support: support.count ?? 0,
  };

  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="sticky top-0 z-40 border-b border-clay-200 bg-cream-100/90 backdrop-blur-md">
        <div className="container-wide flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-cream-50"
                aria-hidden
              >
                <ShieldCheck className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </span>
              <span className="font-serif text-lg font-semibold tracking-tight text-brand-900">
                Roti Ghar <span className="text-clay-500">admin</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-clay-600 hover:bg-clay-100 hover:text-clay-900 sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Member view
            </Link>
            <AdminMobileNav badges={badges} />
            <Link href="/profile" className="rounded-xl p-1 hover:bg-clay-100">
              <Avatar src={user.profile.avatar_url} name={user.profile.full_name} size={32} />
            </Link>
          </div>
        </div>
      </header>

      <div className="container-wide flex gap-8 py-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <AdminSidebar badges={badges} />
          <div className="mt-4 border-t border-clay-200 pt-3">
            <SignOutButton />
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
