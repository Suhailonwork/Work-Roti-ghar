import { NextResponse, type NextRequest } from 'next/server';
import { hasAuthCookie, updateSession } from '@/lib/supabase/middleware';

/**
 * Routing-level auth.
 *
 * This is a fast path, not a security boundary: every gated page calls
 * `requireUser` / `requireApproved` / `requireAdmin` on the server, and RLS
 * stands behind that. So middleware only answers the cheapest question —
 * "is there a valid session?" — and leaves role and approval checks to the
 * server components, which already load the profile anyway. That keeps public
 * pages free of any Supabase round trip.
 */

/** Routes that require a signed-in account (of any status). */
const AUTHENTICATED_PREFIXES = [
  '/dashboard',
  '/feed',
  '/members',
  '/ration',
  '/finance',
  '/reminders',
  '/profile',
  '/notifications',
  '/admin',
  '/pending',
];

const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = matches(pathname, AUTHENTICATED_PREFIXES);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Public page: nothing to decide, so do not touch Supabase at all.
  if (!needsAuth && !isAuthPage) return NextResponse.next();

  const signedIn = hasAuthCookie(request);

  // No session cookie: the answer is known without a network call.
  if (!signedIn) {
    if (needsAuth) return redirectTo(request, '/login', pathname);
    return NextResponse.next();
  }

  try {
    const { response, userId } = await updateSession(request);

    if (!userId) {
      if (needsAuth) return redirectTo(request, '/login', pathname);
      return response;
    }

    // Signed in and on a login/signup page — send them inward. The member
    // layout bounces them to /pending if they are not approved yet.
    if (isAuthPage) return redirectTo(request, '/dashboard');

    return response;
  } catch (error) {
    // A misconfigured or unreachable Supabase must degrade to "let it through
    // and let the server guards decide", never to a 500 on every route.
    console.error('[middleware] session refresh failed:', error);
    return NextResponse.next();
  }
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (next) url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image files and the metadata routes.
     * Auth cookies must be refreshed on real navigations, not on every icon
     * request.
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
