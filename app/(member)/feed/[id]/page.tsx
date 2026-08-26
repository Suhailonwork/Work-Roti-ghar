import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { getComments, getPost } from '@/lib/feed/queries';
import { PostCard } from '@/components/feed/PostCard';
import { CommentSection } from '@/components/feed/CommentSection';
import { buildStaticMetadata } from '@/lib/seo';
import { truncate } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildStaticMetadata({ title: 'Post', path: `/feed/${id}`, noIndex: true });
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireApproved(`/feed/${id}`);

  const post = await getPost(id, user.id);
  if (!post) notFound();

  const comments = await getComments(id, user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the feed
      </Link>

      <h1 className="sr-only">
        Post by {post.author?.full_name ?? 'a member'}: {truncate(post.content, 60)}
      </h1>

      <PostCard post={post} viewerId={user.id} viewerIsAdmin={user.profile.role === 'admin'} detail />

      <CommentSection
        postId={post.id}
        comments={comments}
        viewerId={user.id}
        viewerIsAdmin={user.profile.role === 'admin'}
      />
    </div>
  );
}
