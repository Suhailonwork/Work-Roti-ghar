import { PendingLink as Link } from '@/components/ui/PendingLink';
import { Lock, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { ButtonLink } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';
import { getOrgSettings } from '@/lib/cms/queries';
import { getCurrentUser } from '@/lib/auth';
import { cn, formatCompact, timeAgo, truncate } from '@/lib/utils';
import { bool, link, list, num, safeHref, str, type BlockData } from '@/lib/cms/render';
import type { ImpactStats } from '@/types/database';
import { SectionTitle } from './ContentBlocks';

/**
 * Blocks whose content comes from the database rather than from the block's own
 * JSON. They run on the server so nothing private is shipped to the browser.
 */

// -------------------------------------------------------------- statistics --
export function StatisticsBlock({ data, stats }: { data: BlockData; stats: ImpactStats }) {
  const title = str(data, 'title');
  const subtitle = str(data, 'subtitle');
  const live = str(data, 'source', 'live') === 'live';
  const items = list(data, 'items');

  if (!items.length) return null;

  return (
    <section className="bg-cream-200 py-14 sm:py-18">
      <div className="container-page">
        <SectionTitle title={title} subtitle={subtitle} />
        <dl className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {items.map((item, i) => {
            const key = str(item, 'key');
            const label = str(item, 'label') || key.replace(/_/g, ' ');
            const suffix = str(item, 'suffix');

            const value = live
              ? formatCompact(stats[key as keyof ImpactStats] ?? 0)
              : str(item, 'value') || '0';

            return (
              <div
                key={i}
                className="rounded-2xl border border-clay-200 bg-cream-50 px-5 py-6 text-center shadow-card"
              >
                <dt className="order-2 mt-1.5 text-sm font-medium text-clay-600">{label}</dt>
                <dd className="order-1 font-serif text-3xl font-semibold tracking-tight text-brand-800 sm:text-4xl">
                  {value}
                  {suffix}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------- community posts --
/**
 * Shows recent community activity — but only to approved members. The feed is
 * private, so anonymous visitors and pending applicants get an invitation
 * instead of the content. The gate is enforced by RLS as well: an unapproved
 * caller's query simply returns nothing.
 */
export async function CommunityPostsBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title') || 'From the community';
  const subtitle = str(data, 'subtitle');
  const limit = Math.min(Math.max(num(data, 'limit', 3), 1), 6);

  const user = await getCurrentUser();
  const approved = user?.profile.status === 'active';

  if (!approved) {
    return (
      <section className="container-page py-12 sm:py-16">
        <SectionTitle title={title} subtitle={subtitle} />
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-clay-300 bg-cream-50 px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-clay-100 text-clay-500">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="font-semibold text-brand-900">Our community feed is private</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-clay-600">
            Posts, photographs and updates are visible to approved members only — partly out of respect
            for the families we work with.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup">Apply to join</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, created_at, like_count, comment_count, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!posts?.length) return null;

  return (
    <section className="container-page py-12 sm:py-16">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className={cn('grid gap-4', posts.length > 1 && 'sm:grid-cols-2 lg:grid-cols-3')}>
        {posts.map((post) => {
          const author = (Array.isArray(post.author) ? post.author[0] : post.author) as
            | { id: string; full_name: string; avatar_url: string | null }
            | undefined;

          return (
            <Link
              key={post.id}
              href={`/feed/${post.id}`}
              className="flex h-full flex-col rounded-2xl border border-clay-200 bg-cream-50 p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar src={author?.avatar_url} name={author?.full_name} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-clay-900">{author?.full_name ?? 'A member'}</p>
                  <p className="text-xs text-clay-500">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-clay-700">{truncate(post.content, 180)}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-clay-500">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {post.comment_count} · {post.like_count} likes
              </p>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 text-center">
        <ButtonLink href="/feed" variant="secondary">
          Open the feed
        </ButtonLink>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ contact block --
/**
 * Contact details, read live from Settings → Organisation.
 *
 * Deliberately not stored in the block's own JSON: an address or phone number
 * typed into a page is a copy that goes stale the moment somebody updates
 * Settings, and a wrong number on a contact page is worse than no page. The
 * matching ContactPoint schema is emitted by the page from the same source.
 */
export async function ContactDetailsBlock({ data }: { data: BlockData }) {
  const anchorId = str(data, 'id');
  const title = str(data, 'title') || 'Contact Roti Ghar';
  const subtitle = str(data, 'subtitle');
  const showSocials = bool(data, 'show_socials', true);
  const cta = link(data, 'cta');
  const ctaHref = cta ? safeHref(cta.href) : null;

  const org = await getOrgSettings();

  const rows = [
    org.email && { icon: Mail, label: 'Email', value: org.email, href: `mailto:${org.email}` },
    org.phone && { icon: Phone, label: 'Phone', value: org.phone, href: `tel:${org.phone}` },
    org.address && { icon: MapPin, label: 'Address', value: org.address, href: null },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string | null }[];

  const socials = Object.entries(org.socials ?? {})
    .map(([name, url]) => [name, (url ?? '').trim()] as const)
    .filter(([, url]) => /^https?:\/\//i.test(url));

  if (!rows.length && !socials.length) return null;

  return (
    <section id={anchorId || undefined} className="scroll-mt-24 py-12 sm:py-16">
      <div className="container-narrow">
        <SectionTitle title={title} subtitle={subtitle} />

        {rows.length > 0 && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-start gap-3 rounded-2xl border border-clay-200 bg-cream-50 p-5 shadow-card"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-clay-500">
                      {row.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm leading-relaxed text-clay-800">
                      {row.href ? (
                        <a href={row.href} className="font-medium text-brand-700 hover:text-brand-800 hover:underline">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        )}

        {showSocials && socials.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-3">
            {socials.map(([name, url]) => (
              <li key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="inline-flex rounded-lg border border-clay-200 bg-cream-50 px-4 py-2 text-sm font-medium capitalize text-brand-800 transition-colors hover:bg-cream-100"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        )}

        {cta && ctaHref && (
          <div className="mt-8 text-center">
            <ButtonLink href={ctaHref} variant="secondary" size="lg">
              {cta.label}
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
