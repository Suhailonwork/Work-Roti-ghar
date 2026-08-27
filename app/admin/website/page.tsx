import type { Metadata } from 'next';
import { PendingLink as Link } from '@/components/ui/PendingLink';
import { ExternalLink, Globe, Home, Pencil } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewPageButton } from '@/components/admin/cms/PageForms';
import { PublishToggle } from '@/components/admin/cms/PublishToggle';
import { Badge, EmptyState, SectionHeading } from '@/components/ui';
import { TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { buildStaticMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/utils';
import type { CmsPage, PageStatus } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Website', path: '/admin/website', noIndex: true });
}

const STATUS_TONE: Record<PageStatus, 'green' | 'amber' | 'blue' | 'neutral'> = {
  published: 'green',
  draft: 'amber',
  scheduled: 'blue',
  archived: 'neutral',
};

export default async function WebsitePage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('cms_pages')
    .select('*')
    .order('is_home', { ascending: false })
    .order('updated_at', { ascending: false });

  const pages = (data ?? []) as CmsPage[];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Website"
        description="Build and publish the public site. Nothing here needs a developer."
        action={<NewPageButton />}
      />

      <div className="rounded-xl border border-clay-200 bg-cream-50 px-4 py-3 text-sm leading-relaxed text-clay-600">
        Create a page, add sections, drag them into order, set the SEO, preview it, then publish — the homepage
        itself is built this way, so you can rearrange it whenever you like.
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-5 w-5" />}
          title="No pages yet"
          description="Create your first page to start building the public site."
          action={<NewPageButton />}
        />
      ) : (
        <TableWrap>
          <THead>
            <TH>Page</TH>
            <TH>URL</TH>
            <TH>Status</TH>
            <TH>Last edited</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {pages.length === 0 ? (
              <TableEmpty colSpan={5} message="Nothing here." />
            ) : (
              pages.map((page) => (
                <TR key={page.id}>
                  <TD>
                    <Link
                      href={`/admin/website/${page.id}`}
                      className="flex items-center gap-2 font-medium text-clay-900 hover:underline"
                    >
                      {page.is_home && <Home className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden />}
                      {page.title}
                    </Link>
                  </TD>
                  <TD>
                    <code className="rounded bg-clay-100 px-1.5 py-0.5 text-xs text-clay-700">
                      /{page.is_home ? '' : page.slug}
                    </code>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[page.status]}>{page.status}</Badge>
                      {page.status === 'scheduled' && page.publish_at && (
                        <span className="text-xs text-clay-500">{formatDateTime(page.publish_at)}</span>
                      )}
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-clay-600">{formatDateTime(page.updated_at)}</TD>
                  <TD align="right">
                    <div className="flex items-center justify-end gap-1">
                      <PublishToggle id={page.id} published={page.status === 'published'} />

                      <Link
                        href={`/preview/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-clay-600 hover:bg-clay-100 hover:text-clay-900"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only sm:not-sr-only">Preview</span>
                      </Link>

                      <Link
                        href={`/admin/website/${page.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Link>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </TableWrap>
      )}
    </div>
  );
}
