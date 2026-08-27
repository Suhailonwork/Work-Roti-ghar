import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { Award, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/member/ProfileForm';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Badge, Card, CardBody, CardHeader, CardTitle, SectionHeading, StatCard } from '@/components/ui';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, formatNumber } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Your profile', path: '/profile', noIndex: true });
}

const ROLE_TONE = { admin: 'purple', volunteer: 'blue', member: 'green' } as const;
const ROLE_LABEL = { admin: 'Administrator', volunteer: 'Volunteer', member: 'Member' } as const;

export default async function ProfilePage() {
  const user = await requireApproved('/profile');
  const supabase = await createClient();

  // Only the owner and administrators can read this row — see the RLS policy on
  // `profile_contacts`.
  const { data: contact } = await supabase
    .from('profile_contacts')
    .select('email, mobile, address, reference')
    .eq('profile_id', user.id)
    .maybeSingle();

  const { count: activities } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_verified', true);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeading
        title="Your profile"
        description="What other members see, and the contact details only administrators can see."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Points" value={formatNumber(user.profile.points)} icon={<Award className="h-4 w-4" />} tone="green" />
        <StatCard
          label="Verified activities"
          value={formatNumber(activities ?? 0)}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard label="Posts" value={formatNumber(user.profile.posts_count)} icon={<FileText className="h-4 w-4" />} />
        <StatCard
          label="Member since"
          value={formatDate(user.profile.joined_at ?? user.profile.created_at)}
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Account</CardTitle>
            <p className="mt-1 text-sm text-clay-600">{contact?.email ?? user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={ROLE_TONE[user.profile.role]}>{ROLE_LABEL[user.profile.role]}</Badge>
            <Link
              href={`/members/${user.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              Public view
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <ProfileForm
            profile={{
              full_name: user.profile.full_name,
              bio: user.profile.bio,
              avatar_url: user.profile.avatar_url,
            }}
            contact={{ mobile: contact?.mobile ?? null, address: contact?.address ?? null }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm leading-relaxed text-clay-600">
            To change your password, sign out and use{' '}
            <Link href="/forgot-password" className="font-medium text-brand-700 hover:underline">
              reset your password
            </Link>
            . We will email you a one-time link — nobody at Roti Ghar can see or set your password.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="w-36">
            <SignOutButton label="Sign out of this device" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
