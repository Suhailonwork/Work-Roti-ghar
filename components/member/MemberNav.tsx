'use client';

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Package,
  PlusCircle,
  Receipt,
  Shield,
  Trophy,
  Users,
  UserRound,
} from 'lucide-react';
import { NavLinkIcon } from '@/components/ui/NavLinkIcon';
import { Drawer } from '@/components/ui/Drawer';
import { Avatar, Badge } from '@/components/ui';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';

const ICONS = {
  home: Home,
  dashboard: LayoutDashboard,
  users: Users,
  package: Package,
  receipt: Receipt,
  bell: Bell,
  profile: UserRound,
  shield: Shield,
  create: PlusCircle,
  trophy: Trophy,
  more: LayoutGrid,
} as const;

export type IconName = keyof typeof ICONS;

/** Live counts a menu row can display. */
export type NavBadgeKey = 'reminders' | 'notifications';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles?: UserRole[];
  badge?: number;
  badgeKey?: NavBadgeKey;
  description?: string;
}

export const MEMBER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/feed', label: 'Community', icon: 'home' },
  { href: '/members', label: 'Members', icon: 'users' },
  { href: '/ration', label: 'Ration', icon: 'package' },
  { href: '/finance', label: 'Finance', icon: 'receipt', roles: ['admin', 'volunteer'] },
  { href: '/reminders', label: 'Reminders', icon: 'bell' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
  { href: '/admin', label: 'Admin', icon: 'shield', roles: ['admin'] },
];

/** The five destinations that earn a permanent tab on a phone. */
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/members', label: 'Members', icon: 'users' },
  { href: '/feed/new', label: 'Create', icon: 'create' },
  { href: '/ration', label: 'Ration', icon: 'package' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

/**
 * Everything a signed-in person can reach, grouped — this is what the phone's
 * "More" sheet renders. It is a superset of the desktop sidebar, so no
 * destination is desktop-only. Rows carrying `roles` are filtered exactly the
 * way the sidebar filters them.
 */
export const MOBILE_MENU_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Community',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Your points and activity' },
      { href: '/feed', label: 'Community', icon: 'home', description: 'Posts from everyone' },
      { href: '/feed/new', label: 'Write a post', icon: 'create', description: 'Share an update' },
      { href: '/members', label: 'Members', icon: 'users', description: 'Everyone in Roti Ghar' },
      { href: '/members/top', label: 'Top members', icon: 'trophy', description: 'Leaderboard by points' },
    ],
  },
  {
    heading: 'Work',
    items: [
      { href: '/ration', label: 'Ration', icon: 'package', description: 'Kits and distributions' },
      {
        href: '/finance',
        label: 'Finance',
        icon: 'receipt',
        roles: ['admin', 'volunteer'],
        description: 'Contributions and expenses',
      },
    ],
  },
  {
    heading: 'You',
    items: [
      {
        href: '/reminders',
        label: 'Reminders',
        icon: 'bell',
        badgeKey: 'reminders',
        description: 'Tasks sent to you',
      },
      {
        href: '/notifications',
        label: 'Notifications',
        icon: 'bell',
        badgeKey: 'notifications',
        description: 'Replies, likes and approvals',
      },
      { href: '/profile', label: 'Profile', icon: 'profile', description: 'Your details and photo' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        href: '/admin',
        label: 'Admin panel',
        icon: 'shield',
        roles: ['admin'],
        description: 'Applications, finance, CMS and settings',
      },
    ],
  },
];

export interface NavCounts {
  reminders: number;
  notifications: number;
}

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visible(items: NavItem[], role: UserRole) {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

const ROLE_LABEL = { admin: 'Administrator', volunteer: 'Volunteer', member: 'Member' } as const;

// ------------------------------------------------------------------ sidebar --

export function SidebarNav({ role, unread }: { role: UserRole; unread: number }) {
  const pathname = usePathname();
  const items = visible(MEMBER_NAV, role);

  return (
    <nav className="space-y-0.5" aria-label="Member sections">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        const badge = item.href === '/reminders' ? unread : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-700 text-cream-50 shadow-sm'
                : 'text-clay-700 hover:bg-clay-100 hover:text-clay-900',
            )}
          >
            <NavLinkIcon icon={Icon} size={18} className="shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  active ? 'bg-cream-50 text-brand-800' : 'bg-brand-100 text-brand-800',
                )}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// -------------------------------------------------------------- more sheet --

function MenuRow({
  item,
  count,
  active,
  onNavigate,
}: {
  item: NavItem;
  count: number;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.icon];

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          active ? 'bg-brand-50 text-brand-900' : 'text-clay-800 hover:bg-clay-100',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            active ? 'bg-brand-700 text-cream-50' : 'bg-clay-50 text-clay-700',
          )}
        >
          <NavLinkIcon icon={Icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{item.label}</span>
          {item.description && (
            <span className="block truncate text-xs text-clay-500">{item.description}</span>
          )}
        </span>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </li>
  );
}

export interface NavProfile {
  full_name: string;
  avatar_url: string | null;
  points: number;
}

function MoreSheet({
  open,
  onClose,
  role,
  counts,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  counts: NavCounts;
  profile: NavProfile;
}) {
  const pathname = usePathname();

  const sections = MOBILE_MENU_SECTIONS.map((section) => ({
    ...section,
    items: visible(section.items, role),
  })).filter((section) => section.items.length > 0);

  return (
    <Drawer open={open} onClose={onClose} title="All sections" side="bottom">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-clay-200 bg-cream-100/70 p-3">
        <Avatar src={profile.avatar_url} name={profile.full_name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-clay-900">{profile.full_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={role === 'admin' ? 'purple' : role === 'volunteer' ? 'blue' : 'green'}>
              {ROLE_LABEL[role]}
            </Badge>
            <span className="text-xs text-clay-600">
              <span className="font-semibold text-brand-800">{profile.points}</span> points
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-clay-500">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <MenuRow
                  key={`${section.heading}-${item.href}`}
                  item={item}
                  count={item.badgeKey ? counts[item.badgeKey] : 0}
                  active={isActive(pathname, item.href)}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-clay-200 pt-3">
        <SignOutButton className="px-3 py-2.5" />
      </div>
    </Drawer>
  );
}

// ----------------------------------------------------------------- tab bar --

/**
 * The phone's primary navigation: the five standing tabs, plus a "More" button
 * opening the full menu — so everything the desktop sidebar offers is one tap
 * away rather than desktop-only.
 */
export function MobileTabBar({
  role,
  counts,
  profile,
}: {
  role: UserRole;
  counts: NavCounts;
  profile: NavProfile;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // A tapped row navigates while the sheet is still mounted; close it once the
  // new route lands so the menu is never left hanging over the page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Rotating a tablet past the `lg` breakpoint hides the tab bar that opened
  // the sheet; the sheet itself is portalled, so it would otherwise survive
  // with nothing left to dismiss it.
  useEffect(() => {
    if (!menuOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const close = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    close();
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, [menuOpen]);

  const MoreIcon = ICONS.more;
  const unreadTotal = counts.reminders + counts.notifications;

  return (
    <>
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-clay-200 bg-cream-50/95 backdrop-blur-md lg:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-lg">
          {MOBILE_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            const isCreate = item.icon === 'create';

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-none transition-colors',
                    active ? 'text-brand-800' : 'text-clay-500 hover:text-clay-800',
                  )}
                >
                  <NavLinkIcon
                    icon={Icon}
                    size={isCreate ? 26 : 21}
                    className={cn(isCreate && 'text-brand-700')}
                  />
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label={unreadTotal > 0 ? `More sections, ${unreadTotal} unread` : 'More sections'}
              className={cn(
                'flex w-full flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-none transition-colors',
                menuOpen ? 'text-brand-800' : 'text-clay-500 hover:text-clay-800',
              )}
            >
              <span className="relative">
                <MoreIcon style={{ width: 21, height: 21 }} aria-hidden />
                {unreadTotal > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-red-600 ring-2 ring-cream-50"
                    aria-hidden
                  />
                )}
              </span>
              <span className="w-full truncate text-center">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={role}
        counts={counts}
        profile={profile}
      />
    </>
  );
}
