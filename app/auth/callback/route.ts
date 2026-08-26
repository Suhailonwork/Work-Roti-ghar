import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/utils';

/**
 * Exchanges the one-time code from a Supabase email link (password reset,
 * magic link) for a session, then forwards the member on. `next` is clamped to
 * a path on this site so the link cannot be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirect(searchParams.get('next'), '/dashboard');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
