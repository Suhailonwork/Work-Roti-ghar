import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

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

/** Routes that additionally require an *approved* account. */
const APPROVED_PREFIXES = [
  '/dashboard',
  '/feed',
  '/members',
  '/ration',
  '/finance',
  '/reminders',
  '/profile',
  '/notifications',
  '/admin',
];

const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user, supabase } = await updateSession(request);

  const needsAuth = matches(pathname, AUTHENTICATED_PREFIXES);

  if (!user) {
    if (needsAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Signed in. Look up role/status once so we can gate approval and /admin.
  if (needsAuth || AUTH_PAGES.includes(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    const status = profile?.status ?? 'pending';
    const role = profile?.role ?? 'member';
    const approved = status === 'active';

    if (AUTH_PAGES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = approved ? '/dashboard' : '/pending';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (!approved && matches(pathname, APPROVED_PREFIXES)) {
      const url = request.nextUrl.clone();
      url.pathname = '/pending';
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (approved && pathname === '/pending') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (matches(pathname, ['/admin']) && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth cookies must be
     * refreshed on real navigations, not on every icon request.
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
