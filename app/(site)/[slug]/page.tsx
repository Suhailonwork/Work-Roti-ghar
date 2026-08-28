import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import { getImpactStats, getOrgSettings, getPageBySlug } from '@/lib/cms/queries';
import { faqItemsFromBlocks } from '@/lib/cms/render';
import { breadcrumbJsonLd, buildPageMetadata, contactPageJsonLd, faqJsonLd } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPageBySlug(slug);
  if (!result) return { title: 'Page not found', robots: { index: false, follow: false } };
  return buildPageMetadata(result.page, result.seo);
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  const [result, stats] = await Promise.all([getPageBySlug(slug), getImpactStats()]);

  if (!result) notFound();

  // Breadcrumbs always; the FAQPage and ContactPage nodes only when the page
  // really shows that content. `getOrgSettings` is request-cached and the
  // footer already calls it, so reading it here costs nothing.
  const faqs = faqItemsFromBlocks(result.blocks);
  const hasContactBlock = result.blocks.some(
    (block) => block.block_type === 'contact_details' && block.is_visible,
  );
  const org = hasContactBlock ? await getOrgSettings() : null;

  const jsonLd = [
    breadcrumbJsonLd([{ name: result.page.title, path: `/${result.page.slug}` }]),
    ...(faqs.length ? [faqJsonLd(faqs)] : []),
    ...(org ? [contactPageJsonLd(org, `/${result.page.slug}`)] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlockRenderer blocks={result.blocks} stats={stats} />
    </>
  );
}
