'use client';

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Home,
  LayoutDashboard,
  Package,
  PlusCircle,
  Receipt,
  Shield,
  Users,
  UserRound,
} from 'lucide-react';
import { NavLinkIcon } from '@/components/ui/NavLinkIcon';
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
} as const;

export type IconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles?: UserRole[];
  badge?: number;
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

/** The five destinations that matter on a phone. */
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/members', label: 'Members', icon: 'users' },
  { href: '/feed/new', label: 'Create', icon: 'create' },
  { href: '/ration', label: 'Ration', icon: 'package' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ role, unread }: { role: UserRole; unread: number }) {
  const pathname = usePathname();
  const items = MEMBER_NAV.filter((item) => !item.roles || item.roles.includes(role));

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

export function MobileTabBar() {
  const pathname = usePathname();

  return (
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
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-brand-800' : 'text-clay-500 hover:text-clay-800',
                )}
              >
                <NavLinkIcon
                  icon={Icon}
                  size={isCreate ? 26 : 21}
                  className={cn(isCreate && 'text-brand-700')}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
