import { PendingLink as Link } from '@/components/ui/PendingLink';
import { cn, paragraphs } from '@/lib/utils';
import { ButtonLink } from '@/components/ui/Button';
import { list, link, safeHref, str, type BlockData } from '@/lib/cms/render';

/**
 * Presentational blocks for the public site.
 *
 * CMS images can point anywhere an admin pastes, so these use plain <img> with
 * explicit lazy loading rather than next/image — no host allow-list to keep in
 * sync, and no build-time coupling to the Supabase project URL.
 */

// ------------------------------------------------------------------ shared --
export function Prose({ body, className }: { body: string; className?: string }) {
  const parts = paragraphs(body);
  if (!parts.length) return null;
  return (
    <div className={cn('prose-roti', className)}>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Cta({ cta, variant }: { cta: { label: string; href: string } | null; variant: 'primary' | 'secondary' | 'outline' }) {
  if (!cta) return null;
  const href = safeHref(cta.href);
  if (!href) return null;
  return (
    <ButtonLink href={href} variant={variant} size="lg">
      {cta.label}
    </ButtonLink>
  );
}

function SectionTitle({ title, subtitle, centered = true }: { title: string; subtitle?: string; centered?: boolean }) {
  if (!title && !subtitle) return null;
  return (
    <div className={cn('mb-8 max-w-2xl', centered && 'mx-auto text-center')}>
      {title && (
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-brand-900 sm:text-3xl">{title}</h2>
      )}
      {subtitle && <p className="mt-2.5 text-clay-600">{subtitle}</p>}
    </div>
  );
}

// -------------------------------------------------------------------- hero --
export function HeroBlock({ data }: { data: BlockData }) {
  const eyebrow = str(data, 'eyebrow');
  const title = str(data, 'title');
  const subtitle = str(data, 'subtitle');
  const imageUrl = str(data, 'image_url');
  const imageAlt = str(data, 'image_alt');
  const centered = str(data, 'align', 'left') === 'center';
  const primary = link(data, 'primary_cta');
  const secondary = link(data, 'secondary_cta');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-cream-200 to-cream-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl"
      />
      <div className="container-page relative py-14 sm:py-20 lg:py-24">
        <div
          className={cn(
            'gap-10 lg:gap-14',
            imageUrl && !centered ? 'grid items-center lg:grid-cols-2' : 'flex flex-col',
            centered && 'items-center text-center',
          )}
        >
          <div className={cn(centered && 'max-w-3xl')}>
            {eyebrow && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
            )}
            {title && (
              <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-brand-950 sm:text-4xl lg:text-5xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className={cn('mt-5 text-lg leading-relaxed text-clay-700', centered && 'mx-auto max-w-2xl')}>
                {subtitle}
              </p>
            )}
            {(primary || secondary) && (
              <div className={cn('mt-8 flex flex-wrap gap-3', centered && 'justify-center')}>
                <Cta cta={primary} variant="primary" />
                <Cta cta={secondary} variant="secondary" />
              </div>
            )}
          </div>

          {imageUrl && (
            <div className={cn(centered && 'mt-10 w-full max-w-3xl')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full rounded-3xl border border-clay-200 object-cover shadow-lift"
                loading="eager"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- rich text --
export function RichTextBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title');
  const body = str(data, 'body');
  const variant = str(data, 'variant', 'default');
  const centered = str(data, 'align', 'left') === 'center';

  if (variant === 'notice') {
    return (
      <section className="container-page py-10 sm:py-14">
        <div
          className={cn(
            'rounded-3xl border border-brand-200 bg-brand-50 px-6 py-8 sm:px-10 sm:py-10',
            centered && 'text-center',
          )}
        >
          {title && (
            <h2 className="font-serif text-xl font-semibold text-brand-900 sm:text-2xl">{title}</h2>
          )}
          <Prose body={body} className={cn('mt-3', centered && 'mx-auto max-w-2xl')} />
        </div>
      </section>
    );
  }

  return (
    <section className={cn('container-narrow py-10 sm:py-14', variant === 'muted' && 'opacity-80')}>
      <div className={cn(centered && 'text-center')}>
        {title && (
          <h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-brand-900 sm:text-3xl">
            {title}
          </h2>
        )}
        <Prose body={body} />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- image --
export function ImageBlock({ data }: { data: BlockData }) {
  const url = str(data, 'url');
  const alt = str(data, 'alt');
  const caption = str(data, 'caption');
  if (!url) return null;

  return (
    <section className="container-page py-10 sm:py-14">
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="w-full rounded-3xl border border-clay-200 object-cover shadow-card"
          loading="lazy"
        />
        {caption && <figcaption className="mt-3 text-center text-sm text-clay-600">{caption}</figcaption>}
      </figure>
    </section>
  );
}

// -------------------------------------------------------------- image+text --
export function ImageTextBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title');
  const body = str(data, 'body');
  const imageUrl = str(data, 'image_url');
  const imageAlt = str(data, 'image_alt');
  const imageLeft = str(data, 'image_side', 'right') === 'left';
  const cta = link(data, 'cta');

  return (
    <section className="container-page py-10 sm:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        {imageUrl && (
          <div className={cn(imageLeft ? 'lg:order-1' : 'lg:order-2')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt}
              className="w-full rounded-3xl border border-clay-200 object-cover shadow-card"
              loading="lazy"
            />
          </div>
        )}
        <div className={cn(imageLeft ? 'lg:order-2' : 'lg:order-1')}>
          {title && (
            <h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-brand-900 sm:text-3xl">
              {title}
            </h2>
          )}
          <Prose body={body} />
          {cta && (
            <div className="mt-6">
              <Cta cta={cta} variant="outline" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ hadith --
export function HadithBlock({ data }: { data: BlockData }) {
  const arabic = str(data, 'arabic');
  const text = str(data, 'text');
  const reference = str(data, 'reference');
  const note = str(data, 'translation');

  if (!arabic && !text) return null;

  return (
    <section className="bg-brand-900 py-14 text-cream-100 sm:py-20">
      <div className="container-narrow text-center">
        {arabic && (
          <p className="font-arabic mb-6 text-2xl leading-loose text-cream-50 sm:text-3xl" lang="ar">
            {arabic}
          </p>
        )}
        {text && (
          <blockquote className="font-serif text-xl leading-relaxed text-cream-100 sm:text-2xl">
            &ldquo;{text}&rdquo;
          </blockquote>
        )}
        {reference && (
          <cite className="mt-5 block text-sm font-medium not-italic tracking-wide text-brand-200">
            {reference}
          </cite>
        )}
        {note && <p className="mt-3 text-sm text-brand-200/80">{note}</p>}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- cards --
export function CardsBlock({ data }: { data: BlockData }) {
  const anchorId = str(data, 'id');
  const title = str(data, 'title');
  const subtitle = str(data, 'subtitle');
  const columns = str(data, 'columns', '3');
  const items = list(data, 'items');

  if (!items.length) return null;

  const gridClass =
    columns === '2'
      ? 'sm:grid-cols-2'
      : columns === '4'
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section id={anchorId || undefined} className="container-page scroll-mt-24 py-12 sm:py-16">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className={cn('grid gap-5', gridClass)}>
        {items.map((item, i) => {
          const cardTitle = str(item, 'title');
          const cardBody = str(item, 'body');
          const imageUrl = str(item, 'image_url');
          const href = safeHref(str(item, 'href'));

          const inner = (
            <>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="mb-4 h-36 w-full rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              {cardTitle && <h3 className="font-semibold text-brand-900">{cardTitle}</h3>}
              {cardBody && <p className="mt-2 text-sm leading-relaxed text-clay-600">{cardBody}</p>}
            </>
          );

          const className =
            'block h-full rounded-2xl border border-clay-200 bg-cream-50 p-5 shadow-card transition-shadow hover:shadow-lift';

          return href ? (
            <Link key={i} href={href} className={className}>
              {inner}
            </Link>
          ) : (
            <div key={i} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- gallery --
export function GalleryBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title');
  const subtitle = str(data, 'subtitle');
  const masonry = str(data, 'layout', 'grid') === 'masonry';
  const items = list(data, 'items').filter((item) => str(item, 'url'));

  if (!items.length) return null;

  return (
    <section className="container-page py-12 sm:py-16">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, i) => (
          <figure
            key={i}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-clay-200 bg-clay-100',
              masonry && i % 3 === 0 && 'row-span-2',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={str(item, 'url')}
              alt={str(item, 'alt')}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]',
                masonry && i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-[4/3]',
              )}
              loading="lazy"
            />
            {str(item, 'caption') && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/80 to-transparent px-3 py-2 text-xs font-medium text-cream-50">
                {str(item, 'caption')}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- video --
export function VideoBlock({ data, embed }: { data: BlockData; embed: { kind: 'iframe' | 'video'; src: string } | null }) {
  const title = str(data, 'title');
  const caption = str(data, 'caption');
  const poster = str(data, 'poster_url');

  if (!embed) return null;

  return (
    <section className="container-page py-12 sm:py-16">
      <SectionTitle title={title} />
      <figure className="overflow-hidden rounded-3xl border border-clay-200 bg-clay-900 shadow-card">
        <div className="aspect-video w-full">
          {embed.kind === 'iframe' ? (
            <iframe
              src={embed.src}
              title={title || 'Video'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video src={embed.src} poster={poster || undefined} controls className="h-full w-full" preload="metadata" />
          )}
        </div>
      </figure>
      {caption && <p className="mt-3 text-center text-sm text-clay-600">{caption}</p>}
    </section>
  );
}

// --------------------------------------------------------------------- CTA --
export function CtaBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title');
  const body = str(data, 'body');
  const solid = str(data, 'variant', 'primary') === 'primary';
  const primary = link(data, 'primary_cta');
  const secondary = link(data, 'secondary_cta');

  if (!title) return null;

  return (
    <section className="container-page py-10 sm:py-14">
      <div
        className={cn(
          'rounded-3xl px-6 py-10 text-center sm:px-12 sm:py-14',
          solid ? 'bg-brand-800 text-cream-50' : 'border border-clay-200 bg-cream-200 text-clay-900',
        )}
      >
        <h2 className={cn('font-serif text-2xl font-semibold tracking-tight sm:text-3xl', solid && 'text-cream-50')}>
          {title}
        </h2>
        {body && (
          <p className={cn('mx-auto mt-4 max-w-2xl leading-relaxed', solid ? 'text-brand-100' : 'text-clay-700')}>
            {body}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Cta cta={primary} variant={solid ? 'secondary' : 'primary'} />
          {secondary &&
            (() => {
              const href = safeHref(secondary.href);
              if (!href) return null;
              return (
                <Link
                  href={href}
                  className={cn(
                    'inline-flex h-12 items-center rounded-xl px-7 text-base font-medium underline-offset-4 hover:underline',
                    solid ? 'text-cream-100' : 'text-brand-800',
                  )}
                >
                  {secondary.label}
                </Link>
              );
            })()}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ custom --
export function CustomBlock({ data }: { data: BlockData }) {
  const title = str(data, 'title');
  const body = str(data, 'body');
  const background = str(data, 'background', 'none');
  const width = str(data, 'width', 'default');

  const container =
    width === 'narrow' ? 'container-narrow' : width === 'wide' ? 'container-wide' : 'container-page';
  const dark = background === 'brand';

  return (
    <section
      className={cn(
        'py-12 sm:py-16',
        background === 'cream' && 'bg-cream-200',
        dark && 'bg-brand-900 text-cream-100',
      )}
    >
      <div className={container}>
        {title && (
          <h2
            className={cn(
              'mb-4 font-serif text-2xl font-semibold tracking-tight sm:text-3xl',
              dark ? 'text-cream-50' : 'text-brand-900',
            )}
          >
            {title}
          </h2>
        )}
        <Prose body={body} className={cn(dark && '[&_p]:text-cream-200')} />
      </div>
    </section>
  );
}

export { SectionTitle };
