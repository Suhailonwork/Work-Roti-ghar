'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

/** Debounced search that keeps the current tab and drops the page number. */
export function MemberSearch({ basePath = '/members' }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get('q') ?? '';
      if (current === value.trim()) return;

      if (value.trim()) params.set('q', value.trim());
      else params.delete('q');
      params.delete('page');

      const qs = params.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, router, searchParams, basePath]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search members by name…"
        aria-label="Search members"
        className="h-11 w-full rounded-xl border border-clay-200 bg-white pl-10 pr-10 text-sm shadow-sm placeholder:text-clay-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-clay-400 hover:bg-clay-100 hover:text-clay-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
