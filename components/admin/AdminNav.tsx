'use client';

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  Bell,
  ClipboardList,
  FileStack,
  Flag,
  Gauge,
  Globe,
  HandCoins,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  Trophy,
  Truck,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { NavLinkIcon } from '@/components/ui/NavLinkIcon';
import { Drawer } from '@/components/ui/Drawer';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { cn } from '@/lib/utils';

const SECTIONS: {
  heading: string;
  items: { href: string; label: string; icon: typeof Gauge; badgeKey?: BadgeKey }[];
}[] = [
  {
    heading: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: Gauge }],
  },
  {
    heading: 'People',
    items: [
      { href: '/admin/applications', label: 'Applications', icon: UserPlus, badgeKey: 'applications' },
      { href: '/admin/members', label: 'Members', icon: Users },
      { href: '/admin/top-members', label: 'Top members', icon: Trophy },
    ],
  },
  {
    heading: 'Ration',
    items: [
      { href: '/admin/beneficiaries', label: 'Beneficiaries', icon: ClipboardList },
      { href: '/admin/ration-kits', label: 'Ration kits', icon: Package },
      { href: '/admin/distributions', label: 'Distributions', icon: Truck },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { href: '/admin/contributions', label: 'Contributions', icon: HandCoins, badgeKey: 'contributions' },
      { href: '/admin/expenses', label: 'Expenses', icon: Banknote, badgeKey: 'expenses' },
      { href: '/admin/documents', label: 'Documents', icon: FileStack },
    ],
  },
  {
    heading: 'Community',
    items: [
      { href: '/admin/posts', label: 'Posts', icon: MessageSquare },
      { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
      { href: '/admin/reports', label: 'Reports', icon: Flag, badgeKey: 'reports' },
      { href: '/admin/reminders', label: 'Reminders', icon: Bell },
    ],
  },
  {
    heading: 'Website',
    items: [
      { href: '/admin/website', label: 'Pages & CMS', icon: Globe },
      { href: '/admin/media', label: 'Media', icon: ImageIcon },
      { href: '/admin/support', label: 'Support offers', icon: BadgeCheck, badgeKey: 'support' },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export type BadgeKey = 'applications' | 'contributions' | 'expenses' | 'reports' | 'support';
export type AdminBadges = Partial<Record<BadgeKey, number>>;

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ badges, onNavigate }: { badges: AdminBadges; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5" aria-label="Admin sections">
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-clay-500">
            {section.heading}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              const count = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-700 text-cream-50'
                        : 'text-clay-700 hover:bg-clay-100 hover:text-clay-900',
                    )}
                  >
                    <NavLinkIcon icon={Icon} size={17} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                          active ? 'bg-cream-50 text-brand-800' : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ badges }: { badges: AdminBadges }) {
  return (
    <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6 pr-1">
      <NavList badges={badges} />
    </div>
  );
}

/**
 * Destinations that live outside the admin area. On desktop these sit in the
 * header and the sidebar footer; on a phone there is no room for them there,
 * so the drawer carries them instead — otherwise an admin on a phone has no
 * way back to the member app and no way to sign out.
 */
const MEMBER_LINKS: { href: string; label: string; icon: typeof Gauge }[] = [
  { href: '/dashboard', label: 'Member dashboard', icon: LayoutDashboard },
  { href: '/feed', label: 'Community feed', icon: MessageSquare },
  { href: '/profile', label: 'Your profile', icon: UserRound },
];

export function AdminMobileNav({ badges }: { badges: AdminBadges }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const total = Object.values(badges).reduce((sum, n) => sum + (n ?? 0), 0);

  // Close once the tapped route has landed.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={total > 0 ? `Open admin menu, ${total} needing attention` : 'Open admin menu'}
        className="relative inline-flex items-center gap-2 rounded-xl border border-clay-200 bg-cream-50 px-3 py-2 text-sm font-medium text-clay-800 shadow-sm"
      >
        <Menu className="h-4 w-4" aria-hidden />
        Sections
        {total > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white"
            aria-hidden
          >
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Admin sections" side="right">
        <NavList badges={badges} onNavigate={() => setOpen(false)} />

        <div className="mt-5 border-t border-clay-200 pt-4">
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-clay-500">
            Member area
          </p>
          <ul className="space-y-0.5">
            {MEMBER_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-clay-700 transition-colors hover:bg-clay-100 hover:text-clay-900"
                >
                  <NavLinkIcon icon={item.icon} size={17} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 border-t border-clay-200 pt-3">
          <SignOutButton className="px-3 py-2" />
        </div>
      </Drawer>
    </div>
  );
}
