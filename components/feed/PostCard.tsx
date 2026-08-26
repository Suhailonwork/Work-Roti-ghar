import Link from 'next/link';
import { Megaphone, Pin, Repeat2 } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { cn, timeAgo } from '@/lib/utils';
import type { FeedPost } from '@/lib/feed/queries';
import { PostInteractions } from './PostInteractions';

/**
 * Renders post text, turning any @mention that matches a real mention record
 * into a link. Everything is rendered as text nodes — no HTML from a member is
 * ever interpreted, so a post cannot inject markup.
 */
function PostText({ content, mentions }: { content: string; mentions: { id: string; full_name: string }[] }) {
  if (!content.trim()) return null;

  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());

  // Longest names first so "@Aisha Khan" wins over "@Aisha".
  const sorted = [...mentions].sort((a, b) => b.full_name.length - a.full_name.length);

  function renderLine(line: string, key: string) {
    if (!sorted.length) return <span key={key}>{line}</span>;

    const nodes: React.ReactNode[] = [];
    let rest = line;
    let index = 0;

    while (rest.length) {
      const match = sorted
        .map((m) => ({ member: m, at: rest.indexOf(`@${m.full_name}`) }))
        .filter((m) => m.at !== -1)
        .sort((a, b) => a.at - b.at)[0];

      if (!match) {
        nodes.push(<span key={`${key}-t${index}`}>{rest}</span>);
        break;
      }

      if (match.at > 0) nodes.push(<span key={`${key}-t${index}`}>{rest.slice(0, match.at)}</span>);

      nodes.push(
        <Link
          key={`${key}-m${index}`}
          href={`/members/${match.member.id}`}
          className="font-medium text-brand-700 hover:underline"
        >
          @{match.member.full_name}
        </Link>,
      );

      rest = rest.slice(match.at + match.member.full_name.length + 1);
      index += 1;
    }

    return <span key={key}>{nodes}</span>;
  }

  return (
    <div className="space-y-3 whitespace-pre-wrap text-[15px] leading-relaxed text-clay-800">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{renderLine(paragraph, `p${i}`)}</p>
      ))}
    </div>
  );
}

function MediaGrid({ media }: { media: FeedPost['media'] }) {
  if (!media.length) return null;

  const layout =
    media.length === 1
      ? 'grid-cols-1'
      : media.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={cn('mt-3 grid gap-2', layout)}>
      {media.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'overflow-hidden rounded-xl border border-clay-200 bg-clay-100',
            media.length === 3 && index === 0 && 'sm:col-span-2 sm:row-span-2',
          )}
        >
          {item.type === 'video' ? (
            <video src={item.url} controls preload="metadata" className="h-full w-full object-cover" />
          ) : (
            // Signed URL from a private bucket; a plain <img> keeps the token
            // out of the image optimiser's cache key.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              loading="lazy"
              className={cn('w-full object-cover', media.length === 1 ? 'max-h-[32rem]' : 'aspect-square')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function PostCard({
  post,
  viewerId,
  viewerIsAdmin,
  detail = false,
}: {
  post: FeedPost;
  viewerId: string;
  viewerIsAdmin: boolean;
  detail?: boolean;
}) {
  const author = post.author;
  const canDelete = viewerIsAdmin || author?.id === viewerId;

  return (
    <article
      className={cn(
        'rounded-2xl border bg-cream-50 p-4 shadow-card sm:p-5',
        post.is_announcement ? 'border-saffron-200 bg-saffron-50/40' : 'border-clay-200',
      )}
    >
      <header className="flex items-start gap-3">
        {author ? (
          <Link href={`/members/${author.id}`} className="shrink-0">
            <Avatar src={author.avatar_url} name={author.full_name} size={42} />
          </Link>
        ) : (
          <Avatar name="?" size={42} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {author ? (
              <Link href={`/members/${author.id}`} className="font-medium text-clay-900 hover:underline">
                {author.full_name}
              </Link>
            ) : (
              <span className="font-medium text-clay-500">A former member</span>
            )}

            {author?.role === 'admin' && <Badge tone="purple">Admin</Badge>}
            {author?.role === 'volunteer' && <Badge tone="blue">Volunteer</Badge>}
            {post.is_pinned && (
              <Badge tone="amber">
                <Pin className="h-3 w-3" aria-hidden /> Pinned
              </Badge>
            )}
            {post.is_announcement && (
              <Badge tone="amber">
                <Megaphone className="h-3 w-3" aria-hidden /> Announcement
              </Badge>
            )}
          </div>

          <p className="mt-0.5 text-xs text-clay-500">
            {detail ? (
              <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString('en-IN')}</time>
            ) : (
              <Link href={`/feed/${post.id}`} className="hover:underline">
                {timeAgo(post.created_at)}
              </Link>
            )}
            {post.edited_at && <span className="ml-1.5 text-clay-400">· edited</span>}
          </p>
        </div>
      </header>

      <div className="mt-3">
        <PostText content={post.content} mentions={post.mentions} />
        <MediaGrid media={post.media} />

        {/* ------------------------------------------------ quoted post */}
        {post.shared_post && (
          <div className="mt-3 rounded-xl border border-clay-200 bg-cream-100 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-clay-500">
              <Repeat2 className="h-3.5 w-3.5" aria-hidden />
              Shared from{' '}
              {post.shared_post.author ? (
                <Link href={`/members/${post.shared_post.author.id}`} className="hover:underline">
                  {post.shared_post.author.full_name}
                </Link>
              ) : (
                'a former member'
              )}
            </p>
            <Link href={`/feed/${post.shared_post.id}`} className="block">
              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-clay-700">
                {post.shared_post.content}
              </p>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-3">
        <PostInteractions
          postId={post.id}
          likeCount={post.like_count}
          commentCount={post.comment_count}
          shareCount={post.share_count}
          likedByMe={post.liked_by_me}
          canDelete={canDelete}
          showCommentLink={!detail}
        />
      </div>
    </article>
  );
}
