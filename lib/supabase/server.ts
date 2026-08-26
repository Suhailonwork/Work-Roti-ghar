import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

/**
 * Server Supabase client bound to the caller's session cookies.
 *
 * Uses the anon key, so RLS applies exactly as it does in the browser — server
 * rendering never silently escalates a member's privileges.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // `middleware.ts` refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
