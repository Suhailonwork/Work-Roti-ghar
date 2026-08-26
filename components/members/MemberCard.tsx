import Link from 'next/link';
import { Award, FileText } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Profile } from '@/types/database';

const ROLE_TONE = { admin: 'purple', volunteer: 'blue', member: 'green' } as const;
const ROLE_LABEL = { admin: 'Admin', volunteer: 'Volunteer', member: 'Member' } as const;

export function MemberCard({ member }: { member: Profile }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="flex flex-col items-center rounded-2xl border border-clay-200 bg-cream-50 p-5 text-center shadow-card transition-shadow hover:shadow-lift"
    >
      <Avatar src={member.avatar_url} name={member.full_name} size={64} />

      <p className="mt-3 line-clamp-1 font-medium text-clay-900">{member.full_name}</p>

      <Badge tone={ROLE_TONE[member.role]} className="mt-1.5">
        {ROLE_LABEL[member.role]}
      </Badge>

      <p className="mt-2 text-xs text-clay-500">
        Joined {formatDate(member.joined_at ?? member.created_at)}
      </p>

      <div className="mt-3 flex w-full items-center justify-center gap-4 border-t border-clay-200 pt-3 text-xs text-clay-600">
        <span className="inline-flex items-center gap-1">
          <Award className="h-3.5 w-3.5 text-brand-600" aria-hidden />
          {formatNumber(member.points)}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-clay-400" aria-hidden />
          {formatNumber(member.posts_count)}
        </span>
      </div>
    </Link>
  );
}
