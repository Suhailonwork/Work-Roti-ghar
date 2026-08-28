import type { MetadataRoute } from 'next';
import { getIndexablePages } from '@/lib/cms/queries';
import { absoluteUrl } from '@/lib/env';

type Entry = MetadataRoute.Sitemap[number];
type ChangeFrequency = Entry['changeFrequency'];

/**
 * Static routes change when the code changes, not when somebody asks for the
 * sitemap. Reading the clock once at module load pins their `lastmod` to the
 * deploy that produced them.
 *
 * Calling `new Date()` per entry — which is what this file used to do — stamps
 * every static route as "modified seconds ago" on every single crawl. Google
 * cross-checks `lastmod` against what it actually finds, and once it decides a
 * site's dates are unreliable it discounts them everywhere in the file. That
 * would waste the one genuinely accurate signal here: the real `updated_at`
 * timestamps on the CMS pages.
 */
const DEPLOYED_AT = new Date();

/**
 * Crawl hints per CMS slug.
 *
 * Google ignores `priority` and `changefreq` outright, so these earn nothing
 * from it — they are here for Bing and the other crawlers that still read
 * them, and to keep the file honest about which pages matter. `lastmod`, which
 * every crawler does use, is the part worth getting right.
 */
const CMS_HINTS: Record<string, { priority: number; changeFrequency: ChangeFrequency }> = {
  about: { priority: 0.8, changeFrequency: 'monthly' },
  contact: { priority: 0.8, changeFrequency: 'monthly' },
  // Legal text is reviewed once in a while, not monthly, and it is not what
  // anybody is searching for. Saying otherwise just wastes crawl budget.
  'privacy-policy': { priority: 0.3, changeFrequency: 'yearly' },
  'terms-and-conditions': { priority: 0.3, changeFrequency: 'yearly' },
};

const CMS_DEFAULT = { priority: 0.7, changeFrequency: 'monthly' as ChangeFrequency };

/**
 * Only live, indexable CMS pages appear here — drafts, archived pages,
 * scheduled pages whose time has not arrived, and anything an editor marked
 * no-index are all excluded. Private member routes are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getIndexablePages();

  const cmsEntries: MetadataRoute.Sitemap = pages.map((page) => {
    const hint = page.is_home
      ? { priority: 1, changeFrequency: 'weekly' as ChangeFrequency }
      : (CMS_HINTS[page.slug] ?? CMS_DEFAULT);

    return {
      url: absoluteUrl(page.is_home ? '/' : `/${page.slug}`),
      lastModified: new Date(page.updated_at),
      changeFrequency: hint.changeFrequency,
      priority: hint.priority,
    };
  });

  const hasHome = pages.some((page) => page.is_home);

  // Routes that live in the app rather than the CMS.
  const staticEntries: MetadataRoute.Sitemap = [
    ...(hasHome
      ? []
      : [
          {
            url: absoluteUrl('/'),
            lastModified: DEPLOYED_AT,
            changeFrequency: 'weekly' as ChangeFrequency,
            priority: 1,
          },
        ]),
    { url: absoluteUrl('/support'), lastModified: DEPLOYED_AT, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/signup'), lastModified: DEPLOYED_AT, changeFrequency: 'yearly', priority: 0.5 },
    // Kept deliberately: /login carries brand metadata for "workrotighar login"
    // style queries. Low priority because that is all it is good for.
    { url: absoluteUrl('/login'), lastModified: DEPLOYED_AT, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // An admin can create a CMS page at any slug, including one that already
  // belongs to a hand-built route. That would emit the same <loc> twice, which
  // the sitemap protocol does not allow. CMS entries come first and win, since
  // they carry a real modification date rather than the deploy time.
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  for (const entry of [...cmsEntries, ...staticEntries]) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    entries.push(entry);
  }

  return entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.url.localeCompare(b.url));
}







