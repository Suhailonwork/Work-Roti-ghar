import type { Metadata } from 'next';
import { ImageIcon } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MediaCard, UploadMediaButton, type MediaRecord } from '@/components/admin/cms/MediaLibrary';
import { EmptyState, SectionHeading } from '@/components/ui';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Media', path: '/admin/media', noIndex: true });
}

export default async function MediaPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('media')
    .select('id, url, filename, alt_text, folder, size_bytes, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const items = (data ?? []) as MediaRecord[];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Media"
        description="Images used across the public website. Give each one alt text — it is what screen readers announce."
        action={<UploadMediaButton />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title="No images yet"
          description="Upload photographs from packing days and delivery rounds, then drop them into a page."
          action={<UploadMediaButton />}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
