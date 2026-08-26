import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * The signed-in user together with their profile, or null.
 *
 * Wrapped in `cache()` so a page that calls it from several components still
 * makes one round trip per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return { id: user.id, email: user.email ?? '', profile };
});

/** Requires any signed-in account. Redirects to /login otherwise. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login');
  }
  return user;
}

/** Requires an approved (status = active) account. */
export async function requireApproved(nextPath?: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.profile.status !== 'active') {
    redirect('/pending');
  }
  return user;
}

/** Requires an approved account holding one of the given roles. */
export async function requireRole(roles: UserRole[], nextPath?: string): Promise<SessionUser> {
  const user = await requireApproved(nextPath);
  if (!roles.includes(user.profile.role)) {
    redirect('/dashboard');
  }
  return user;
}

/** Requires an approved administrator. */
export function requireAdmin(nextPath?: string): Promise<SessionUser> {
  return requireRole(['admin'], nextPath);
}

/** Requires an approved volunteer or administrator. */
export function requireVolunteer(nextPath?: string): Promise<SessionUser> {
  return requireRole(['admin', 'volunteer'], nextPath);
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.profile.role === 'admin' && user.profile.status === 'active';
}

export function isVolunteer(user: SessionUser | null): boolean {
  return (
    (user?.profile.role === 'admin' || user?.profile.role === 'volunteer') &&
    user.profile.status === 'active'
  );
}

/**
 * Guard for server actions. Unlike the `require*` helpers it throws instead of
 * redirecting, so the caller can return a form error.
 */
export async function assertRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('You need to sign in to do that.');
  if (user.profile.status !== 'active') throw new Error('Your account is not approved yet.');
  if (!roles.includes(user.profile.role)) throw new Error('You do not have permission to do that.');
  return user;
}
