import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { ArrowLeft } from 'lucide-react';
import { requireApproved } from '@/lib/auth';
import { PostComposer } from '@/components/feed/PostComposer';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Write a post', path: '/feed/new', noIndex: true });
}

export default async function NewPostPage() {
  const user = await requireApproved('/feed/new');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the feed
      </Link>

      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">Write a post</h1>
        <p className="mt-1 text-sm text-clay-600">
          Share an update, a thank you, or something the community should know.
        </p>
      </div>

      <PostComposer
        author={{ full_name: user.profile.full_name, avatar_url: user.profile.avatar_url }}
        canAnnounce={user.profile.role === 'admin'}
        autoFocus
      />
    </div>
  );
}
