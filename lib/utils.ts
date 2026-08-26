import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ------------------------------------------------------------------ numbers --
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return inr.format(0);
  return inr.format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatCompact(value: number | null | undefined): string {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

// -------------------------------------------------------------------- dates --
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "just now", "4h", "3d", then an absolute date past a week. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return formatDate(d);
}

/** Start of a named period, for leaderboard and finance filters. */
export function periodStart(period: 'month' | 'year' | 'all'): string | null {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).toISOString();
  return null;
}

// ------------------------------------------------------------------ strings --
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function truncate(input: string | null | undefined, length: number): string {
  if (!input) return '';
  return input.length <= length ? input : `${input.slice(0, length - 1).trimEnd()}…`;
}

/** Splits body copy into paragraphs on blank lines. */
export function paragraphs(body: string | null | undefined): string[] {
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Restricts a redirect target to a path on this site, so `?next=` can never be
 * used to bounce a signed-in member to an attacker's domain.
 */
export function safeRedirect(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

// ------------------------------------------------------------------- misc --
export function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
}

export function formatBytes(bytes: number | null | undefined): string {
  const n = bytes ?? 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Builds a randomised storage object path under an owner-scoped folder. */
export function storagePath(folder: string, filename: string): string {
  const ext = fileExtension(filename);
  const stem = slugify(filename.replace(/\.[^.]+$/, '')) || 'file';
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${folder}/${stem}-${unique}${ext ? `.${ext}` : ''}`;
}
