'use client';

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Menu,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShieldAlert,
  Trophy,
  Truck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { NavLinkIcon } from '@/components/ui/NavLinkIcon';
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

export function AdminMobileNav({ badges }: { badges: AdminBadges }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="inline-flex items-center gap-2 rounded-xl border border-clay-200 bg-cream-50 px-3 py-2 text-sm font-medium text-clay-800 shadow-sm"
      >
        <Menu className="h-4 w-4" aria-hidden />
        Sections
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-clay-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="h-full w-72 overflow-y-auto border-l border-clay-200 bg-cream-50 p-4 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-clay-900">
                <ShieldAlert className="h-4 w-4 text-brand-700" aria-hidden />
                Admin
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-clay-500 hover:bg-clay-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList badges={badges} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
