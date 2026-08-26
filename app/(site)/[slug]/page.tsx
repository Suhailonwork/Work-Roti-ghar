import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import { getImpactStats, getPageBySlug } from '@/lib/cms/queries';
import { buildPageMetadata } from '@/lib/seo';

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

  return <BlockRenderer blocks={result.blocks} stats={stats} />;
}
