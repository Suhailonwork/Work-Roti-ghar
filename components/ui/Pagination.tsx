'use client';

import { PendingLink as Link } from '@/components/ui/PendingLink';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Keeps every other query parameter intact while changing the page. */
export function Pagination({
  page,
  pageSize,
  total,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (total <= pageSize) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete('page');
    else params.set('page', String(target));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass =
    'inline-flex h-9 items-center gap-1 rounded-lg border border-clay-200 bg-cream-50 px-3 text-sm font-medium text-clay-700 hover:bg-cream-200';

  return (
    <div className={cn('flex items-center justify-between gap-3 pt-4', className)}>
      <p className="text-sm text-clay-600">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span className={cn(linkClass, 'cursor-not-allowed opacity-50')}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </span>
        )}
        {page < lastPage ? (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(linkClass, 'cursor-not-allowed opacity-50')}>
            Next <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
