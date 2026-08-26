'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface TabItem {
  label: string;
  href: string;
  count?: number;
}

/**
 * URL-driven tabs. Each tab is a real link, so tab state survives a refresh and
 * is shareable — which matters for member and admin list screens.
 */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;

  return (
    <div className={cn('no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <nav className="inline-flex min-w-full gap-1 border-b border-clay-200" aria-label="Tabs">
        {items.map((item) => {
          const active = current === item.href || (current.split('?')[0] === item.href && !searchParams.toString());
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-brand-800 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-700'
                  : 'text-clay-600 hover:text-clay-900',
              )}
            >
              {item.label}
              {typeof item.count === 'number' && (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                    active ? 'bg-brand-100 text-brand-800' : 'bg-clay-100 text-clay-600',
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
