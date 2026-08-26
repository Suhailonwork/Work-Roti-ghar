import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  Contribution,
  Expense,
  ExpenseCategory,
  FinanceSummaryRow,
  VerificationStatus,
} from '@/types/database';

/**
 * Headline finance figures.
 *
 * Balance is deliberately `verified contributions − verified expenses`, so
 * unverified paperwork never moves the number an administrator sees.
 */
export async function getFinanceSummary(): Promise<FinanceSummaryRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('finance_summary');

  const empty: FinanceSummaryRow = { total_received: 0, total_spent: 0, balance: 0 };
  if (error || !data) return empty;

  const row = Array.isArray(data) ? data[0] : (data as FinanceSummaryRow);
  if (!row) return empty;

  return {
    total_received: Number(row.total_received) || 0,
    total_spent: Number(row.total_spent) || 0,
    balance: Number(row.balance) || 0,
  };
}

export interface ContributionRow extends Contribution {
  contributor?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export async function getContributions({
  status,
  search,
  page = 1,
  pageSize = 25,
}: {
  status?: VerificationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ContributionRow[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('contributions')
    .select('*, contributor:profiles!contributions_contributor_id_fkey(id, full_name, avatar_url)', {
      count: 'exact',
    });

  if (status) query = query.eq('verification_status', status);
  if (search?.trim()) query = query.ilike('contributor_name', `%${search.trim()}%`);

  const { data, count } = await query
    .order('contributed_on', { ascending: false })
    .range(from, from + pageSize - 1);

  const rows = (data ?? []).map((row) => ({
    ...row,
    contributor: Array.isArray(row.contributor) ? (row.contributor[0] ?? null) : (row.contributor ?? null),
  })) as unknown as ContributionRow[];

  return { rows, total: count ?? 0 };
}

export async function getExpenses({
  status,
  category,
  page = 1,
  pageSize = 25,
}: {
  status?: VerificationStatus;
  category?: ExpenseCategory;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: Expense[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase.from('expenses').select('*', { count: 'exact' });

  if (status) query = query.eq('verification_status', status);
  if (category) query = query.eq('category', category);

  const { data, count } = await query
    .order('spent_on', { ascending: false })
    .range(from, from + pageSize - 1);

  return { rows: (data ?? []) as Expense[], total: count ?? 0 };
}

export interface MonthlyPoint {
  month: string;
  received: number;
  spent: number;
}

/**
 * Verified money in and out for the last N months, for the dashboard chart.
 * Aggregated in the app rather than in SQL to keep it to two round trips.
 */
export async function getMonthlyFinance(months = 6): Promise<MonthlyPoint[]> {
  const supabase = await createClient();

  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  const since = start.toISOString().slice(0, 10);

  const [contributions, expenses] = await Promise.all([
    supabase
      .from('contributions')
      .select('amount, contributed_on')
      .eq('verification_status', 'verified')
      .gte('contributed_on', since),
    supabase
      .from('expenses')
      .select('amount, spent_on')
      .eq('verification_status', 'verified')
      .gte('spent_on', since),
  ]);

  const buckets = new Map<string, MonthlyPoint>();

  for (let i = 0; i < months; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, {
      month: date.toLocaleString('en-IN', { month: 'short' }),
      received: 0,
      spent: 0,
    });
  }

  for (const row of contributions.data ?? []) {
    const key = String(row.contributed_on).slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.received += Number(row.amount) || 0;
  }

  for (const row of expenses.data ?? []) {
    const key = String(row.spent_on).slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.spent += Number(row.amount) || 0;
  }

  return [...buckets.values()];
}

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
}

export async function getExpensesByCategory(): Promise<CategoryTotal[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('verification_status', 'verified');

  const totals = new Map<ExpenseCategory, number>();
  for (const row of data ?? []) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + (Number(row.amount) || 0));
  }

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** Counts awaiting an administrator's verification. */
export async function getPendingFinanceCounts(): Promise<{ contributions: number; expenses: number }> {
  const supabase = await createClient();

  const [{ count: contributions }, { count: expenses }] = await Promise.all([
    supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
  ]);

  return { contributions: contributions ?? 0, expenses: expenses ?? 0 };
}
