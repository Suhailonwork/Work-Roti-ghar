'use client';

import { useState } from 'react';
import { Facebook, Play } from 'lucide-react';

/**
 * A Facebook post embed that costs nothing until somebody asks for it.
 *
 * Facebook's own embed instructions load `sdk.js` — roughly 200KB of
 * JavaScript that runs on every visit, sets cookies and phones home whether or
 * not the reader ever looks at the post. On a page whose job is to rank, that
 * is a large Largest Contentful Paint bill for one decorative card.
 *
 * So this renders a lightweight placeholder and only creates the iframe when
 * the reader clicks it. Until then the page makes no request to Facebook at
 * all: no third-party script, no cookies, no layout shift. The permalink below
 * is a real anchor, so the post is reachable — and crawlable — even for
 * somebody who never clicks, and for anybody browsing without JavaScript.
 */
export function FacebookEmbed({ url, caption }: { url: string; caption?: string }) {
  const [active, setActive] = useState(false);

  const src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
    url,
  )}&show_text=true&width=500`;

  return (
    <figure className="mx-auto w-full max-w-[500px]">
      <div className="overflow-hidden rounded-2xl border border-clay-200 bg-cream-50 shadow-card">
        {active ? (
          <iframe
            src={src}
            title={caption || 'Facebook post from Roti Ghar'}
            className="h-[640px] w-full border-0"
            loading="lazy"
            scrolling="no"
            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="flex h-[280px] w-full flex-col items-center justify-center gap-3 px-6 text-center transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Facebook className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-serif text-base font-semibold text-brand-900">
              {caption || 'An update from our Facebook page'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <Play className="h-3.5 w-3.5" aria-hidden />
              Load the post
            </span>
            <span className="text-xs leading-relaxed text-clay-500">
              Nothing is requested from Facebook until you choose to load it.
            </span>
          </button>
        )}
      </div>

      <figcaption className="mt-3 text-center text-sm">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          View this post on Facebook
        </a>
      </figcaption>
    </figure>
  );
}
