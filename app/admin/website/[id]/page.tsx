import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BlockEditor, type EditorBlock } from '@/components/admin/cms/BlockEditor';
import { PageSettingsForm, RevisionsPanel, SeoForm, type RevisionView } from '@/components/admin/cms/PageForms';
import type { MediaItem } from '@/components/admin/cms/BlockField';
import { Badge, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { buildStaticMetadata } from '@/lib/seo';
import type { CmsPage, CmsSeo, PageStatus } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const STATUS_TONE: Record<PageStatus, 'green' | 'amber' | 'blue' | 'neutral'> = {
  published: 'green',
  draft: 'amber',
  scheduled: 'blue',
  archived: 'neutral',
};

const TABS = [
  { key: 'content', label: 'Content' },
  { key: 'seo', label: 'SEO' },
  { key: 'settings', label: 'Settings' },
  { key: 'versions', label: 'Versions' },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildStaticMetadata({ title: 'Edit page', path: `/admin/website/${id}`, noIndex: true });
}

export default async function EditPagePage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : 'content';

  const supabase = await createClient();

  const { data: page } = await supabase.from('cms_pages').select('*').eq('id', id).maybeSingle();
  if (!page) notFound();

  const [blocksResult, seoResult, revisionsResult, mediaResult] = await Promise.all([
    supabase
      .from('cms_page_blocks')
      .select('id, block_type, position, data, is_visible')
      .eq('page_id', id)
      .order('position', { ascending: true }),
    supabase.from('cms_seo').select('*').eq('page_id', id).maybeSingle(),
    supabase
      .from('cms_revisions')
      .select('id, version, note, created_at, author:profiles!cms_revisions_created_by_fkey(full_name)')
      .eq('page_id', id)
      .order('version', { ascending: false })
      .limit(20),
    supabase
      .from('media')
      .select('id, url, alt_text, filename')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(120),
  ]);

  const blocks = (blocksResult.data ?? []) as unknown as EditorBlock[];
  const seo = (seoResult.data ?? null) as CmsSeo | null;
  const library = (mediaResult.data ?? []) as MediaItem[];

  const revisions: RevisionView[] = ((revisionsResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    (row) => {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      return {
        id: row.id as string,
        version: row.version as number,
        note: (row.note as string) ?? null,
        created_at: row.created_at as string,
        author: (author as { full_name?: string } | null)?.full_name ?? null,
      };
    },
  );

  const typedPage = page as CmsPage;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/website"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All pages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-brand-900">{typedPage.title}</h1>
            <Badge tone={STATUS_TONE[typedPage.status]}>{typedPage.status}</Badge>
            {typedPage.is_home && <Badge tone="purple">Homepage</Badge>}
          </div>
          <p className="mt-1 text-sm text-clay-600">
            <code className="rounded bg-clay-100 px-1.5 py-0.5 text-xs">
              /{typedPage.is_home ? '' : typedPage.slug}
            </code>
            <span className="ml-2 text-clay-400">version {typedPage.version}</span>
          </p>
        </div>

        <Link
          href={`/preview/${typedPage.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-clay-200 bg-cream-50 px-4 text-sm font-medium text-brand-800 shadow-sm hover:bg-cream-200"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Preview
        </Link>
      </div>

      {/* Tabs are links so the editor state survives a refresh. */}
      <nav className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Editor sections">
        <div className="inline-flex min-w-full gap-1 border-b border-clay-200">
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Link
                key={item.key}
                href={`/admin/website/${id}?tab=${item.key}`}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium text-brand-800 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-700'
                    : 'whitespace-nowrap px-3.5 py-2.5 text-sm font-medium text-clay-600 transition-colors hover:text-clay-900'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {tab === 'content' && <BlockEditor pageId={id} blocks={blocks} library={library} />}

      {tab === 'seo' && (
        <Card>
          <CardHeader>
            <CardTitle>Search and social</CardTitle>
            <p className="mt-1 text-sm text-clay-600">
              What search engines and messaging apps show when this page is found or shared.
            </p>
          </CardHeader>
          <CardBody>
            <SeoForm pageId={id} seo={seo} pageTitle={typedPage.title} />
          </CardBody>
        </Card>
      )}

      {tab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Page settings</CardTitle>
            <p className="mt-1 text-sm text-clay-600">Its address, whether it is public, and when.</p>
          </CardHeader>
          <CardBody>
            <PageSettingsForm page={typedPage} />
          </CardBody>
        </Card>
      )}

      {tab === 'versions' && (
        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <p className="mt-1 text-sm text-clay-600">
              Snapshots of this page&rsquo;s sections and SEO settings.
            </p>
          </CardHeader>
          <CardBody>
            <RevisionsPanel pageId={id} revisions={revisions} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
