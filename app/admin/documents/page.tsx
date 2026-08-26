import type { Metadata } from 'next';
import { FileStack, Lock, Paperclip } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signedUrls } from '@/lib/storage';
import { DeleteDocumentButton, UploadDocumentButton } from '@/components/admin/DocumentForms';
import { Badge, EmptyState, SectionHeading } from '@/components/ui';
import { TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { buildStaticMetadata } from '@/lib/seo';
import { formatBytes, formatDate } from '@/lib/utils';
import type { DocumentRow } from '@/types/database';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Documents', path: '/admin/documents', noIndex: true });
}

export default async function DocumentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(120);

  const documents = (data ?? []) as DocumentRow[];

  // Private bucket — hand out short-lived signed links rather than public URLs.
  const urls = await signedUrls(
    supabase,
    'documents',
    documents.map((doc) => doc.path),
    60 * 10,
  );

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Documents"
        description="Kept in a private bucket. Links below expire after ten minutes."
        action={<UploadDocumentButton />}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileStack className="h-5 w-5" />}
          title="No documents yet"
          description="Keep registration papers, agreements and important receipts together here."
          action={<UploadDocumentButton />}
        />
      ) : (
        <TableWrap>
          <THead>
            <TH>Document</TH>
            <TH>Category</TH>
            <TH>Size</TH>
            <TH>Visibility</TH>
            <TH>Uploaded</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {documents.map((doc) => (
              <TR key={doc.id}>
                <TD>
                  <p className="font-medium text-clay-900">{doc.title}</p>
                  {doc.description && (
                    <p className="max-w-sm truncate text-xs text-clay-500">{doc.description}</p>
                  )}
                </TD>
                <TD className="text-clay-600">{doc.category ?? '—'}</TD>
                <TD className="whitespace-nowrap text-xs text-clay-600">{formatBytes(doc.size_bytes)}</TD>
                <TD>
                  {doc.is_private ? (
                    <Badge tone="red">
                      <Lock className="h-3 w-3" aria-hidden />
                      Admins
                    </Badge>
                  ) : (
                    <Badge tone="green">All members</Badge>
                  )}
                </TD>
                <TD className="whitespace-nowrap text-xs text-clay-600">{formatDate(doc.created_at)}</TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1">
                    {urls[doc.path] && (
                      <a
                        href={urls[doc.path]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <Paperclip className="h-3.5 w-3.5" aria-hidden />
                        Open
                      </a>
                    )}
                    <DeleteDocumentButton id={doc.id} title={doc.title} />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </TableWrap>
      )}
    </div>
  );
}
