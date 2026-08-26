import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import { getHomePage, getImpactStats, getOrgSettings } from '@/lib/cms/queries';
import { buildPageMetadata, organisationJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage();
  if (!home) return { title: 'Roti Ghar' };
  return buildPageMetadata({ ...home.page, is_home: true }, home.seo);
}

export default async function HomePage() {
  const [home, stats, org] = await Promise.all([getHomePage(), getImpactStats(), getOrgSettings()]);

  if (!home) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd(org)) }}
      />
      <BlockRenderer blocks={home.blocks} stats={stats} />
    </>
  );
}
