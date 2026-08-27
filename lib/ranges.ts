/**
 * Date ranges for the beneficiary / distribution views.
 *
 * Shared between the server components that query and the client component
 * that renders the picker, so there is exactly one definition of what "last
 * month" means. No `server-only` here on purpose.
 *
 * Ration is not handed out on a fixed schedule, so every range is resolved
 * against the `distributed_on` date actually recorded for each delivery — the
 * app never infers a distribution from a date alone.
 */

export type RangeKey = 'last-month' | 'this-month' | 'prev-month' | 'last-3-months' | 'all' | 'custom';

export interface ResolvedRange {
  key: RangeKey;
  /** Inclusive lower bound as YYYY-MM-DD, or null for "all time". */
  from: string | null;
  /** Inclusive upper bound as YYYY-MM-DD, or null for "all time". */
  to: string | null;
  label: string;
}

/** YYYY-MM-DD in the viewer's own calendar, not UTC. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** True for a well-formed calendar date such as 2026-08-27. */
export function isIsoDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value;
}

export const RANGE_PRESETS: { key: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { key: 'last-month', label: 'Last month' },
  { key: 'this-month', label: 'This month' },
  { key: 'prev-month', label: 'Previous month' },
  { key: 'last-3-months', label: 'Last 3 months' },
  { key: 'all', label: 'All time' },
];

function presetBounds(key: Exclude<RangeKey, 'custom'>, today: Date): { from: string | null; to: string | null } {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  switch (key) {
    case 'this-month':
      return { from: isoDate(startOfMonth), to: isoDate(today) };

    case 'prev-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      // Day 0 of this month is the last day of the previous one.
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: isoDate(start), to: isoDate(end) };
    }

    case 'last-3-months': {
      const start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      return { from: isoDate(start), to: isoDate(today) };
    }

    case 'all':
      return { from: null, to: null };

    case 'last-month':
    default: {
      // A rolling month back from today rather than the previous calendar
      // month, so a delivery made three days ago is still on screen.
      const start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      return { from: isoDate(start), to: isoDate(today) };
    }
  }
}

/**
 * Turn `?range=`/`?from=`/`?to=` into a range to query with.
 *
 * An explicit `from` or `to` always wins, so a manually chosen date survives a
 * reload and can be shared as a link. With nothing in the URL the default is
 * the last month.
 */
export function resolveRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): ResolvedRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const customFrom = isIsoDate(params.from) ? params.from : null;
  const customTo = isIsoDate(params.to) ? params.to : null;

  if (customFrom || customTo) {
    // Tolerate a range entered back to front rather than returning nothing.
    const [from, to] =
      customFrom && customTo && customFrom > customTo ? [customTo, customFrom] : [customFrom, customTo];

    return { key: 'custom', from, to, label: rangeLabel(from, to) };
  }

  const preset = RANGE_PRESETS.find((option) => option.key === params.range) ?? RANGE_PRESETS[0];
  const bounds = presetBounds(preset.key, today);

  return { key: preset.key, ...bounds, label: preset.label };
}

function formatBound(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Human wording for a resolved range, used in headings and empty states. */
export function rangeLabel(from: string | null, to: string | null): string {
  if (from && to) return `${formatBound(from)} — ${formatBound(to)}`;
  if (from) return `Since ${formatBound(from)}`;
  if (to) return `Up to ${formatBound(to)}`;
  return 'All time';
}
