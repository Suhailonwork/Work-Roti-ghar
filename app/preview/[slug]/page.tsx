import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, PencilLine } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { BlockRenderer } from '@/components/cms/BlockRenderer';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { getImpactStats, getPageBySlug } from '@/lib/cms/queries';

export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Renders a page exactly as the public site would, including drafts, scheduled
 * pages and hidden blocks. Administrator-only — `requireAdmin()` redirects
 * anyone else before a single draft byte is rendered.
 */
export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin(`/preview/${slug}`);

  const [result, stats] = await Promise.all([getPageBySlug(slug, true), getImpactStats()]);
  if (!result) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-brand-900 px-4 py-2 text-sm text-cream-100">
        <span className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden />
          Preview — <strong className="font-medium">{result.page.title}</strong> is{' '}
          <span className="rounded bg-brand-800 px-1.5 py-0.5 text-xs">{result.page.status}</span>
          {result.blocks.some((b) => !b.is_visible) && (
            <span className="text-brand-200">· hidden sections are shown faded</span>
          )}
        </span>
        <Link
          href={`/admin/website/${result.page.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-medium text-brand-900 hover:bg-white"
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden />
          Back to the editor
        </Link>
      </div>

      <SiteHeader />
      <main id="main" className="flex-1">
        <BlockRenderer blocks={result.blocks} stats={stats} showHidden />
      </main>
      <SiteFooter />
    </div>
  );
}
