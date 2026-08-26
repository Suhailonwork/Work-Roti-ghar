import 'server-only';

import type { Metadata } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/env';
import { getSeoDefaults } from '@/lib/cms/queries';
import type { CmsPage, CmsSeo } from '@/types/database';

/**
 * Builds Next.js metadata for a CMS page.
 *
 * Everything an editor sets in the SEO tab wins; anything they leave blank
 * falls back to the page title and the site-wide defaults in `site_settings`.
 */
export async function buildPageMetadata(
  page: Pick<CmsPage, 'title' | 'slug' | 'is_home'>,
  seo: CmsSeo | null,
): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  const path = page.is_home ? '/' : `/${page.slug}`;
  const title = seo?.seo_title?.trim() || page.title || defaults.title;
  const description = seo?.meta_description?.trim() || defaults.description;
  const canonical = seo?.canonical_url?.trim() || absoluteUrl(path);

  const ogImage = seo?.og_image_url?.trim() || defaults.og_image;
  const twitterImage = seo?.twitter_image_url?.trim() || ogImage;

  const indexable = !seo?.no_index;

  return {
    title,
    description,
    keywords: seo?.keywords?.length ? seo.keywords : undefined,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: 'website',
      siteName: defaults.site_name,
      url: canonical,
      title: seo?.og_title?.trim() || title,
      description: seo?.og_description?.trim() || description,
      images: ogImage
        ? [{ url: absoluteUrl(ogImage), alt: seo?.og_image_alt?.trim() || title }]
        : undefined,
    },
    twitter: {
      card: (seo?.twitter_card as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: seo?.twitter_title?.trim() || seo?.og_title?.trim() || title,
      description: seo?.twitter_description?.trim() || seo?.og_description?.trim() || description,
      images: twitterImage ? [absoluteUrl(twitterImage)] : undefined,
      site: defaults.twitter_site || undefined,
    },
  };
}

/** Metadata for the app's own (non-CMS) routes. */
export async function buildStaticMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
}): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  const canonical = absoluteUrl(path);
  const desc = description || defaults.description;

  return {
    title,
    description: desc,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false, nocache: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: defaults.site_name,
      url: canonical,
      title,
      description: desc,
      images: defaults.og_image ? [{ url: absoluteUrl(defaults.og_image), alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
  };
}

/** Organisation JSON-LD for the homepage. */
export function organisationJsonLd(org: { name: string; email: string; phone: string; address: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: org.name,
    url: SITE_URL,
    email: org.email || undefined,
    telephone: org.phone || undefined,
    address: org.address || undefined,
    description:
      'A volunteer-run community initiative delivering monthly ration kits to families in need.',
  };
}
