import type { MetadataRoute } from 'next';
import { getIndexablePages } from '@/lib/cms/queries';
import { absoluteUrl } from '@/lib/env';

/**
 * Only live, indexable CMS pages appear here — drafts, archived pages,
 * scheduled pages whose time has not arrived, and anything an editor marked
 * no-index are all excluded. Private member routes are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getIndexablePages();

  const cmsEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: absoluteUrl(page.is_home ? '/' : `/${page.slug}`),
    lastModified: new Date(page.updated_at),
    changeFrequency: page.is_home ? 'weekly' : 'monthly',
    priority: page.is_home ? 1 : 0.7,
  }));

  const hasHome = pages.some((p) => p.is_home);

  const staticEntries: MetadataRoute.Sitemap = [
    ...(hasHome ? [] : [{ url: absoluteUrl('/'), lastModified: new Date(), priority: 1 } as const]),
    { url: absoluteUrl('/support'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/signup'), lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: absoluteUrl('/login'), lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [...cmsEntries, ...staticEntries];
}
