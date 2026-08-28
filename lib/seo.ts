import 'server-only';

import type { Metadata } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/env';
import { getSeoDefaults } from '@/lib/cms/queries';
import type { CmsPage, CmsSeo } from '@/types/database';

/**
 * Brand keywords.
 *
 * `workrotighar` is the domain and the primary term people search for;
 * `roti ghar` / `rotighar` are the spellings they actually type. These are
 * merged into every indexable page so a page never ships without them, while
 * anything an editor adds in the SEO tab comes first.
 */
export const BRAND_KEYWORDS = [
  'workrotighar',
  'work roti ghar',
  'rotighar',
  'roti ghar',
  'roti ghar work',
  'rotighar work',
  'volunteer work',
  'community kitchen',
  'ration kit',
  'food support',
  'NGO',
] as const;

export const SITE_LOCALE = 'en_IN';

/** OG image dimensions are fixed by the image generated at /og-image. */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

function mimeForImage(url: string): string | undefined {
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.jpe?g(\?|$)/i.test(url)) return 'image/jpeg';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  if (/\.svg(\?|$)/i.test(url)) return 'image/svg+xml';
  // The generated /og-image route has no extension and serves PNG.
  if (/\/og-image\/?(\?|$)/i.test(url)) return 'image/png';
  return undefined;
}

/**
 * Social scrapers want width, height and type alongside the URL — without them
 * Facebook, WhatsApp and LinkedIn often fall back to a bare link with no card.
 */
function ogImage(url: string, alt: string) {
  const absolute = absoluteUrl(url);
  return {
    url: absolute,
    secureUrl: absolute,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: mimeForImage(absolute),
    alt,
  };
}

/** Editor keywords first, brand keywords after, no duplicates. */
function mergeKeywords(pageKeywords?: readonly string[] | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const keyword of [...(pageKeywords ?? []), ...BRAND_KEYWORDS]) {
    const value = keyword.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

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

  const ogImageUrl = seo?.og_image_url?.trim() || defaults.og_image;
  const twitterImageUrl = seo?.twitter_image_url?.trim() || ogImageUrl;
  const ogImageAlt = seo?.og_image_alt?.trim() || title;

  const indexable = !seo?.no_index;

  return {
    // A CMS SEO title is authored whole, so it must not pick up the root
    // layout's "%s · Workrotighar" template and say the brand twice.
    title: { absolute: title },
    description,
    keywords: indexable ? mergeKeywords(seo?.keywords) : undefined,
    metadataBase: new URL(SITE_URL),
    applicationName: defaults.site_name,
    authors: [{ name: defaults.site_name, url: SITE_URL }],
    creator: defaults.site_name,
    publisher: defaults.site_name,
    alternates: { canonical },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: false, nocache: true },
    verification: googleVerification ? { google: googleVerification } : undefined,
    openGraph: {
      type: 'website',
      siteName: defaults.site_name,
      locale: SITE_LOCALE,
      url: canonical,
      title: seo?.og_title?.trim() || title,
      description: seo?.og_description?.trim() || description,
      images: ogImageUrl ? [ogImage(ogImageUrl, ogImageAlt)] : undefined,
    },
    twitter: {
      card: (seo?.twitter_card as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: seo?.twitter_title?.trim() || seo?.og_title?.trim() || title,
      description: seo?.twitter_description?.trim() || seo?.og_description?.trim() || description,
      images: twitterImageUrl ? [ogImage(twitterImageUrl, ogImageAlt)] : undefined,
      site: defaults.twitter_site || undefined,
      creator: defaults.twitter_site || undefined,
    },
  };
}

/** Metadata for the app's own (non-CMS) routes. */
export async function buildStaticMetadata({
  title,
  description,
  path,
  noIndex = false,
  keywords,
}: {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
  keywords?: string[];
}): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  const canonical = absoluteUrl(path);
  const desc = description || defaults.description;
  const image = defaults.og_image;

  return {
    // A plain string keeps the root layout's title template, so these pages
    // read as "Support our work · Workrotighar".
    title,
    description: desc,
    keywords: noIndex ? undefined : mergeKeywords(keywords),
    metadataBase: new URL(SITE_URL),
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        },
    openGraph: {
      type: 'website',
      siteName: defaults.site_name,
      locale: SITE_LOCALE,
      url: canonical,
      title,
      description: desc,
      images: image ? [ogImage(image, title)] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: image ? [ogImage(image, title)] : undefined,
      site: defaults.twitter_site || undefined,
    },
  };
}

interface OrgLike {
  name: string;
  email: string;
  phone: string;
  address: string;
  socials?: Record<string, string | undefined> | null;
}

/** Non-empty, absolute social profile URLs — Google ignores anything else. */
function sameAs(org: OrgLike): string[] | undefined {
  const urls = Object.values(org.socials ?? {})
    .map((value) => value?.trim() ?? '')
    .filter((value) => /^https?:\/\//i.test(value));
  return urls.length ? urls : undefined;
}

const ORG_DESCRIPTION =
  'Workrotighar is the official website of Roti Ghar, a volunteer-run community kitchen and ration support initiative delivering monthly ration kits to families in need.';

/** Organisation JSON-LD for the homepage. */
export function organisationJsonLd(org: OrgLike) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${SITE_URL}/#organisation`,
    name: org.name || 'Roti Ghar',
    alternateName: ['Workrotighar', 'Work Roti Ghar', 'Rotighar', 'Roti Ghar'],
    url: SITE_URL,
    logo: absoluteUrl('/icon.svg'),
    image: absoluteUrl('/og-image'),
    email: org.email || undefined,
    telephone: org.phone || undefined,
    address: org.address || undefined,
    sameAs: sameAs(org),
    knowsAbout: ['community kitchen', 'ration kit distribution', 'volunteer work', 'food security'],
    description: ORG_DESCRIPTION,
  };
}

/** WebSite JSON-LD — this is what ties the "Workrotighar" brand query to the site. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Workrotighar',
    alternateName: ['Roti Ghar', 'Rotighar', 'Work Roti Ghar'],
    url: SITE_URL,
    inLanguage: 'en-IN',
    description: ORG_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organisation` },
  };
}

/** Breadcrumb JSON-LD for pages below the homepage. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** FAQ JSON-LD — eligible for rich results on brand queries. */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
