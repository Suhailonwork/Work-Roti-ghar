import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import { getHomePage, getImpactStats, getOrgSettings } from '@/lib/cms/queries';
import { faqItemsFromBlocks } from '@/lib/cms/render';
import { buildPageMetadata, faqJsonLd, organisationJsonLd, websiteJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage();
  if (!home) return { title: { absolute: 'Workrotighar — Roti Ghar Community Kitchen & Ration Support' } };
  return buildPageMetadata({ ...home.page, is_home: true }, home.seo);
}

export default async function HomePage() {
  const [home, stats, org] = await Promise.all([getHomePage(), getImpactStats(), getOrgSettings()]);

  if (!home) notFound();

  // The FAQ markup is read back out of the blocks the page actually renders,
  // so it always describes copy a visitor can see. No FAQ block on the page
  // means no FAQPage node — an empty one would be a structured data error.
  const faqs = faqItemsFromBlocks(home.blocks);

  // One graph: the organisation, the site that publishes it, and the FAQ.
  const jsonLd = [
    organisationJsonLd(org),
    websiteJsonLd(),
    ...(faqs.length ? [faqJsonLd(faqs)] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlockRenderer blocks={home.blocks} stats={stats} />
    </>
  );
}
