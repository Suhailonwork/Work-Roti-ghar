/**
 * Environment access.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and are safe in the browser.
 * The service role key is read lazily and only from server code — see
 * `lib/supabase/admin.ts`, which is marked server-only.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loudly in development, but do not crash a production build just
    // because an env var is missing at compile time — it is read at runtime.
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
      );
    }
    return '';
  }
  return value;
}

export const env = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://workrotighar.com',
};

export const SITE_URL = env.siteUrl;

/** Absolute URL for canonical tags, sitemaps and OG images. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
