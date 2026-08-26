import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { getFeedPosts } from '@/lib/feed/queries';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { EmptyState } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { buildStaticMetadata } from '@/lib/seo';

const PAGE_SIZE = 10;

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Community', path: '/feed', noIndex: true });
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireApproved('/feed');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { posts, total } = await getFeedPosts({ viewerId: user.id, page, pageSize: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Community</h1>
        <p className="mt-1 text-sm text-clay-600">
          Visible to approved members only. Please do not post families&rsquo; names, photographs or addresses.
        </p>
      </div>

      <PostComposer
        author={{ full_name: user.profile.full_name, avatar_url: user.profile.avatar_url }}
        canAnnounce={user.profile.role === 'admin'}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="Nothing here yet"
          description="When members start sharing updates from the rounds, they will appear here."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={user.id}
              viewerIsAdmin={user.profile.role === 'admin'}
            />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
