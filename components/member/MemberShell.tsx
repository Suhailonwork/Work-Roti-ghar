import { PendingLink as Link } from '@/components/ui/PendingLink';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { SessionUser } from '@/lib/auth';
import { Avatar, Badge } from '@/components/ui';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { MobileTabBar, SidebarNav } from './MemberNav';

const ROLE_LABEL = { admin: 'Administrator', volunteer: 'Volunteer', member: 'Member' } as const;

/**
 * Chrome for every signed-in page: a sidebar on desktop, a tab bar on phones.
 * Only reachable by approved members — the layouts that use it call
 * `requireApproved()` first, and middleware turns away anyone else.
 */
export async function MemberShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const [{ count: unreadNotifications }, { count: unreadReminders }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    supabase
      .from('reminder_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('is_read', false),
  ]);

  return (
    <div className="min-h-dvh bg-cream-100">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-clay-200 bg-cream-100/90 backdrop-blur-md">
        <div className="container-wide flex h-16 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 font-serif text-base font-semibold text-cream-50"
              aria-hidden
            >
              R
            </span>
            <span className="hidden font-serif text-lg font-semibold tracking-tight text-brand-900 sm:block">
              Roti Ghar
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-xl p-2.5 text-clay-600 transition-colors hover:bg-clay-100 hover:text-clay-900"
              aria-label={
                unreadNotifications
                  ? `Notifications, ${unreadNotifications} unread`
                  : 'Notifications'
              }
            >
              <Bell className="h-5 w-5" aria-hidden />
              {Boolean(unreadNotifications) && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {unreadNotifications! > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-clay-100"
            >
              <Avatar src={user.profile.avatar_url} name={user.profile.full_name} size={32} />
              <span className="hidden text-sm font-medium text-clay-800 sm:block">
                {user.profile.full_name.split(' ')[0]}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container-wide flex gap-8 py-6">
        {/* ----------------------------------------------------- sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-2xl border border-clay-200 bg-cream-50 p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar src={user.profile.avatar_url} name={user.profile.full_name} size={42} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-clay-900">{user.profile.full_name}</p>
                  <Badge tone={user.profile.role === 'admin' ? 'purple' : user.profile.role === 'volunteer' ? 'blue' : 'green'} className="mt-1">
                    {ROLE_LABEL[user.profile.role]}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5 border-t border-clay-200 pt-3">
                <span className="text-lg font-semibold text-brand-800">{user.profile.points}</span>
                <span className="text-xs text-clay-600">contribution points</span>
              </div>
            </div>

            <SidebarNav role={user.profile.role} unread={unreadReminders ?? 0} />

            <div className="border-t border-clay-200 pt-3">
              <SignOutButton />
            </div>
          </div>
        </aside>

        {/* -------------------------------------------------------- main */}
        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
