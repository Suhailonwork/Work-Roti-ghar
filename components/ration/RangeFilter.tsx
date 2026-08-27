'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarRange, X } from 'lucide-react';
import { RANGE_PRESETS, type RangeKey } from '@/lib/ranges';
import { cn } from '@/lib/utils';

/**
 * Preset + manual date range picker, driven entirely by the URL.
 *
 * Keeping the range in `?range=` / `?from=` / `?to=` means a chosen window
 * survives a refresh, can be linked to, and is read by the server component
 * that runs the query — no client-side fetching and no state to fall out of
 * sync with what is on screen.
 */
export function RangeFilter({
  activeKey,
  from,
  to,
  anchorId,
}: {
  activeKey: RangeKey;
  from: string | null;
  to: string | null;
  /** Element id to scroll back to after the range changes. */
  anchorId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(next: { range?: string; from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    for (const key of ['range', 'from', 'to'] as const) {
      const value = next[key];
      if (value) params.set(key, value);
      else params.delete(key);
    }

    // A new window always starts at the first page of results.
    params.delete('page');

    const qs = params.toString();
    const hash = anchorId ? `#${anchorId}` : '';
    router.replace(`${pathname}${qs ? `?${qs}` : ''}${hash}`, { scroll: false });
  }

  const isCustom = activeKey === 'custom';

  return (
    <div className="rounded-2xl border border-clay-200 bg-cream-50 px-4 py-3.5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-clay-700">
          <CalendarRange className="h-4 w-4 text-brand-700" aria-hidden />
          Showing
        </span>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range presets">
          {RANGE_PRESETS.map((preset) => {
            const active = !isCustom && activeKey === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={active}
                onClick={() => apply(preset.key === 'last-month' ? {} : { range: preset.key })}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-brand-700 text-cream-50 shadow-sm'
                    : 'bg-clay-100 text-clay-700 hover:bg-clay-200 hover:text-clay-900',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <label className="text-xs font-medium text-clay-600" htmlFor="range-from">
            From
          </label>
          <input
            id="range-from"
            type="date"
            value={from ?? ''}
            max={to ?? undefined}
            onChange={(event) => apply({ from: event.target.value, to: to ?? undefined })}
            className="h-9 rounded-lg border border-clay-200 bg-white px-2.5 text-sm text-clay-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />

          <label className="text-xs font-medium text-clay-600" htmlFor="range-to">
            To
          </label>
          <input
            id="range-to"
            type="date"
            value={to ?? ''}
            min={from ?? undefined}
            onChange={(event) => apply({ from: from ?? undefined, to: event.target.value })}
            className="h-9 rounded-lg border border-clay-200 bg-white px-2.5 text-sm text-clay-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />

          {isCustom && (
            <button
              type="button"
              onClick={() => apply({})}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-clay-600 hover:bg-clay-100 hover:text-clay-900"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
