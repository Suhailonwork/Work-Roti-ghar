import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/** True when the request carries a Supabase auth cookie worth validating. */
export function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
}

/**
 * Refreshes the auth session and returns the response (carrying any rotated
 * cookies) together with the signed-in user's id.
 *
 * Only the id is returned: role and status are re-read on the server by
 * `lib/auth.ts`, so middleware never needs a database round trip.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env vars must not take the whole site down — see the callers, which
  // fall through to the server-side guards instead.
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars are missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT locally with WebCrypto when the project uses
  // asymmetric signing keys, which saves a round trip to the auth server on
  // every request. It falls back to a server call for symmetric secrets.
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims.sub ?? null);

  return { response, userId, supabase };
}
