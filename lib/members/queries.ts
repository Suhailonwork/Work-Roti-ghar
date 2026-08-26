import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { periodStart } from '@/lib/utils';
import type { LeaderboardRow, PointCategory, Profile } from '@/types/database';

export type MemberTab = 'all' | 'new' | 'active';
export type LeaderboardPeriod = 'month' | 'year' | 'all';

/**
 * The member directory.
 *
 * Deliberately selects only public profile columns — phone, address and
 * application notes live in `profile_contacts`, which ordinary members cannot
 * read at all. There is no query here that could leak them by accident.
 */
export async function getMembers({
  tab = 'all',
  search,
  page = 1,
  pageSize = 24,
}: {
  tab?: MemberTab;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ members: Profile[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, bio, role, status, points, posts_count, joined_at, last_seen_at, created_at, updated_at, referred_by, approved_at, approved_by, suspended_until',
      { count: 'exact' },
    )
    .eq('status', 'active');

  if (search?.trim()) {
    query = query.ilike('full_name', `%${search.trim()}%`);
  }

  if (tab === 'new') {
    query = query.order('joined_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  } else if (tab === 'active') {
    query = query
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('posts_count', { ascending: false });
  } else {
    query = query.order('full_name', { ascending: true });
  }

  const { data, count } = await query.range(from, from + pageSize - 1);

  return { members: (data ?? []) as Profile[], total: count ?? 0 };
}

/** A single member's public profile. */
export async function getMemberProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  return data;
}

export interface MemberActivity {
  verifiedActivities: number;
  recentPoints: { id: string; points: number; reason: string; occurred_at: string; category: PointCategory }[];
}

/**
 * Activity summary for a profile page.
 *
 * Members can only read their own `point_transactions` rows, so for anyone
 * else's profile the ledger comes back empty and only the aggregate count —
 * which is public information on the leaderboard anyway — is shown.
 */
export async function getMemberActivity(profileId: string, viewerId: string): Promise<MemberActivity> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_verified', true);

  if (profileId !== viewerId) {
    return { verifiedActivities: count ?? 0, recentPoints: [] };
  }

  const { data } = await supabase
    .from('point_transactions')
    .select('id, points, reason, occurred_at, category')
    .eq('profile_id', profileId)
    .eq('is_verified', true)
    .order('occurred_at', { ascending: false })
    .limit(10);

  return { verifiedActivities: count ?? 0, recentPoints: data ?? [] };
}

/**
 * Leaderboard for a category and period.
 *
 * Runs through the `leaderboard()` SECURITY DEFINER function so members never
 * need read access to anyone else's points ledger.
 */
export async function getLeaderboard({
  category,
  period = 'all',
  limit = 20,
}: {
  category?: PointCategory;
  period?: LeaderboardPeriod;
  limit?: number;
}): Promise<LeaderboardRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('leaderboard', {
    p_category: category ?? null,
    p_since: periodStart(period),
    p_limit: limit,
  });

  if (error || !data) return [];
  return data as LeaderboardRow[];
}

export interface MemberOfMonthEntry {
  year: number;
  month: number;
  citation: string | null;
  profile: { id: string; full_name: string; avatar_url: string | null } | null;
}

export async function getMemberOfMonth(limit = 1): Promise<MemberOfMonthEntry[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('member_of_month')
    .select('year, month, citation, profile:profiles!member_of_month_profile_id_fkey(id, full_name, avatar_url)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    year: row.year,
    month: row.month,
    citation: row.citation,
    profile: (Array.isArray(row.profile) ? row.profile[0] : row.profile) ?? null,
  }));
}

/** Counts for the member tabs. */
export async function getMemberCounts(): Promise<{ all: number; recent: number }> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: all }, { count: recent }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('joined_at', thirtyDaysAgo),
  ]);

  return { all: all ?? 0, recent: recent ?? 0 };
}
