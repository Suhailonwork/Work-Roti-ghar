'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

/**
 * Browser Supabase client. Only ever sees the anon key, so every query it makes
 * is subject to the row level security policies in `supabase/migrations`.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
