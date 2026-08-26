import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, CheckCircle2, FileText, MessageSquare } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { getMemberActivity, getMemberProfile } from '@/lib/members/queries';
import { getFeedPosts } from '@/lib/feed/queries';
import { PostCard } from '@/components/feed/PostCard';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  StatCard,
} from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDate, formatNumber } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

const ROLE_TONE = { admin: 'purple', volunteer: 'blue', member: 'green' } as const;
const ROLE_LABEL = { admin: 'Administrator', volunteer: 'Volunteer', member: 'Member' } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getMemberProfile(id);
  return buildStaticMetadata({
    title: profile?.full_name ?? 'Member',
    path: `/members/${id}`,
    noIndex: true,
  });
}

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  const viewer = await requireApproved(`/members/${id}`);

  const profile = await getMemberProfile(id);
  if (!profile || profile.status !== 'active') notFound();

  const isSelf = profile.id === viewer.id;

  const [activity, { posts }] = await Promise.all([
    getMemberActivity(profile.id, viewer.id),
    getFeedPosts({ viewerId: viewer.id, authorId: profile.id, page: 1, pageSize: 5 }),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All members
      </Link>

      {/* ------------------------------------------------------- header */}
      <Card>
        <CardBody className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar src={profile.avatar_url} name={profile.full_name} size={88} />

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">
              {profile.full_name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone={ROLE_TONE[profile.role]}>{ROLE_LABEL[profile.role]}</Badge>
              <span className="text-sm text-clay-600">
                Joined {formatDate(profile.joined_at ?? profile.created_at)}
              </span>
            </div>

            {profile.bio && <p className="mt-3 leading-relaxed text-clay-700">{profile.bio}</p>}
          </div>

          {isSelf && (
            <ButtonLink href="/profile" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
          )}
        </CardBody>
      </Card>

      {/* -------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Points"
          value={formatNumber(profile.points)}
          icon={<Award className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Verified activities"
          value={formatNumber(activity.verifiedActivities)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Posts"
          value={formatNumber(profile.posts_count)}
          icon={<FileText className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Member since"
          value={formatDate(profile.joined_at ?? profile.created_at)}
          icon={<MessageSquare className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      {/* ---------------------------------------------- own point ledger */}
      {isSelf && activity.recentPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your points ledger</CardTitle>
            <p className="mt-1 text-sm text-clay-600">Only you and administrators can see this.</p>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-clay-200">
              {activity.recentPoints.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-clay-800">{entry.reason}</p>
                    <p className="text-xs text-clay-500">
                      {formatDate(entry.occurred_at)} · {entry.category}
                    </p>
                  </div>
                  <span
                    className={
                      entry.points >= 0
                        ? 'shrink-0 text-sm font-semibold text-brand-700'
                        : 'shrink-0 text-sm font-semibold text-red-700'
                    }
                  >
                    {entry.points >= 0 ? '+' : ''}
                    {entry.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* -------------------------------------------------------- posts */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-clay-900">
          {isSelf ? 'Your posts' : `Posts by ${profile.full_name.split(' ')[0]}`}
        </h2>

        {posts.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No posts yet"
            description={isSelf ? 'Share something with the community.' : 'Nothing shared so far.'}
            action={isSelf ? <ButtonLink href="/feed/new" size="sm">Write a post</ButtonLink> : undefined}
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={viewer.id}
              viewerIsAdmin={viewer.profile.role === 'admin'}
            />
          ))
        )}
      </section>
    </div>
  );
}
