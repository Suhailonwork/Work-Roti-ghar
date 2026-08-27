'use client';

import { useState, useTransition } from 'react';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { changeMemberRoleAction, changeMemberStatusAction } from '@/lib/actions/members';
import { Avatar, Badge, Select } from '@/components/ui';
import { TD, TR } from '@/components/ui/Table';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Profile, UserRole, UserStatus } from '@/types/database';

const STATUS_TONE: Record<UserStatus, 'green' | 'amber' | 'red' | 'neutral'> = {
  active: 'green',
  pending: 'amber',
  rejected: 'red',
  suspended: 'red',
  inactive: 'neutral',
};

/**
 * A member row with inline role and status controls.
 *
 * Both selects call server actions that re-check the caller is an admin and
 * refuse self-edits, so an administrator cannot accidentally demote or suspend
 * their own account and lock themselves out.
 */
export function MemberRow({
  member,
  contact,
  isSelf,
}: {
  member: Profile;
  contact?: { email: string; mobile: string | null } | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(member.role);
  const [status, setStatus] = useState<UserStatus>(member.status);

  function updateRole(next: UserRole) {
    const previous = role;
    setRole(next);
    startTransition(async () => {
      const result = await changeMemberRoleAction(member.id, next);
      if (result.ok) {
        toast.success(result.message ?? 'Role updated.');
        router.refresh();
      } else {
        setRole(previous);
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  function updateStatus(next: UserStatus) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await changeMemberStatusAction(member.id, next);
      if (result.ok) {
        toast.success(result.message ?? 'Status updated.');
        router.refresh();
      } else {
        setStatus(previous);
        toast.error(result.message ?? 'That did not work.');
      }
    });
  }

  return (
    <TR>
      <TD>
        <div className="flex items-center gap-3">
          <Avatar src={member.avatar_url} name={member.full_name} size={36} />
          <div className="min-w-0">
            <Link
              href={`/members/${member.id}`}
              className="block truncate font-medium text-clay-900 hover:underline"
            >
              {member.full_name}
            </Link>
            {contact && <p className="truncate text-xs text-clay-500">{contact.email}</p>}
          </div>
        </div>
      </TD>

      <TD className="whitespace-nowrap text-xs text-clay-600">{contact?.mobile ?? '—'}</TD>

      <TD>
        {isSelf ? (
          <Badge tone="purple">You</Badge>
        ) : (
          <Select
            value={role}
            disabled={pending}
            onChange={(e) => updateRole(e.target.value as UserRole)}
            aria-label={`Role for ${member.full_name}`}
            className="h-9 w-32 text-xs"
          >
            <option value="member">Member</option>
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </Select>
        )}
      </TD>

      <TD>
        {isSelf ? (
          <Badge tone={STATUS_TONE[status]}>{status}</Badge>
        ) : (
          <Select
            value={status}
            disabled={pending}
            onChange={(e) => updateStatus(e.target.value as UserStatus)}
            aria-label={`Status for ${member.full_name}`}
            className="h-9 w-32 text-xs"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </Select>
        )}
      </TD>

      <TD align="right" className="tabular-nums">
        {formatNumber(member.points)}
      </TD>

      <TD align="right" className="whitespace-nowrap text-xs text-clay-600">
        {formatDate(member.joined_at ?? member.created_at)}
      </TD>
    </TR>
  );
}
