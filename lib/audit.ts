import 'server-only';

import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';

type Client = SupabaseClient<Database>;

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  before?: Json | null;
  after?: Json | null;
}

/**
 * Writes an audit record for a privileged change.
 *
 * Called after member approvals, role changes, financial edits and content
 * removal. Failures are swallowed deliberately: an audit write must never be
 * the reason a legitimate administrative action appears to fail. The rows are
 * append-only — there is no UPDATE or DELETE policy on `audit_logs`.
 */
export async function recordAudit(supabase: Client, entry: AuditEntry): Promise<void> {
  try {
    const headerList = await headers();
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerList.get('x-real-ip') ||
      null;

    await supabase.from('audit_logs').insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip_address: ip,
      user_agent: headerList.get('user-agent')?.slice(0, 400) ?? null,
    });
  } catch (error) {
    console.error('[audit] failed to record entry', entry.action, error);
  }
}

/** Human-readable label for an audit action, used by the admin log viewer. */
export const AUDIT_LABELS: Record<string, string> = {
  'member.approved': 'Member approved',
  'member.rejected': 'Application rejected',
  'member.status_changed': 'Member status changed',
  'member.role_changed': 'Member role changed',
  'points.adjusted': 'Points adjusted',
  'member_of_month.selected': 'Member of the month selected',
  'beneficiary.created': 'Family added',
  'beneficiary.updated': 'Family updated',
  'beneficiary.deleted': 'Family removed',
  'distribution.created': 'Distribution recorded',
  'distribution.updated': 'Distribution updated',
  'distribution.deleted': 'Distribution deleted',
  'contribution.created': 'Contribution recorded',
  'contribution.updated': 'Contribution updated',
  'contribution.verified': 'Contribution verification changed',
  'contribution.deleted': 'Contribution deleted',
  'expense.created': 'Expense recorded',
  'expense.updated': 'Expense updated',
  'expense.verified': 'Expense verification changed',
  'expense.deleted': 'Expense deleted',
  'kit.created': 'Ration kit created',
  'kit.updated': 'Ration kit updated',
  'kit.deleted': 'Ration kit deleted',
  'post.removed': 'Post removed',
  'post.restored': 'Post restored',
  'comment.removed': 'Comment removed',
  'report.resolved': 'Report resolved',
  'page.created': 'Page created',
  'page.updated': 'Page updated',
  'page.published': 'Page published',
  'page.unpublished': 'Page unpublished',
  'page.deleted': 'Page deleted',
  'page.reverted': 'Page reverted to an earlier version',
  'settings.updated': 'Settings updated',
  'document.uploaded': 'Document uploaded',
  'document.deleted': 'Document deleted',
  'reminder.sent': 'Reminder sent',
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action.replace(/[._]/g, ' ');
}
