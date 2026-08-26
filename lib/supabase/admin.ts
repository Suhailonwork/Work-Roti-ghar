import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `import 'server-only'` makes it a build error to pull this into a client
 * component, so the key can never reach the browser. Every call site must first
 * establish who the caller is — use `requireAdmin()` from `lib/auth.ts`.
 *
 * Only reach for this when RLS genuinely cannot express the operation:
 *   - creating auth users during signup (the applicant has no session yet)
 *   - reading a pending applicant's contact details for the approval screen
 *   - administrative operations on the auth schema
 * Everything else should go through the session-scoped client in `server.ts`.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in .env.local (server-side only — never expose it to the browser).',
    );
  }

  return createSupabaseClient<Database>(env.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
