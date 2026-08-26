'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { defaultBlockData, getBlockDef } from '@/lib/cms/blocks';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, optionalFile, removeFile, uploadFile } from '@/lib/storage';
import { blockSchema, pageSchema, reorderSchema, seoSchema, toFormErrors, type FormState } from '@/lib/validation';
import { slugify } from '@/lib/utils';
import type { Json } from '@/types/database';

type ActionResult = { ok: boolean; message?: string };

const ADMIN = ['admin'] as const;

/**
 * Slugs the application itself owns. A CMS page may not claim one of these,
 * because a static route would shadow it and the page would never render.
 */
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'auth', 'dashboard', 'feed', 'members', 'ration', 'finance',
  'support', 'reminders', 'profile', 'notifications', 'login', 'signup',
  'pending', 'forgot-password', 'reset-password', 'sitemap', 'robots', 'preview',
]);

function failure(error: unknown): FormState {
  return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
}

/** Revalidates the public routes a page change affects. */
function revalidatePage(slug: string, isHome: boolean) {
  revalidatePath('/admin/website');
  revalidatePath('/sitemap.xml');
  if (isHome) revalidatePath('/');
  revalidatePath(`/${slug}`);
}

// -------------------------------------------------------------------- pages --
export async function createPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const title = formData.get('title')?.toString().trim() ?? '';
  const rawSlug = formData.get('slug')?.toString().trim() || slugify(title);

  const parsed = pageSchema.safeParse({
    title,
    slug: rawSlug,
    status: formData.get('status') || 'draft',
    publish_at: formData.get('publish_at') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  if (RESERVED_SLUGS.has(parsed.data.slug)) {
    return { ok: false, errors: { slug: [`"${parsed.data.slug}" is used by the app itself. Choose another.`] } };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cms_pages')
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: 'draft',
      created_by: admin.id,
      updated_by: admin.id,
    })
    .select('id, slug')
    .single();

  if (error || !data) {
    if (error?.code === '23505') return { ok: false, errors: { slug: ['That URL is already taken.'] } };
    return { ok: false, message: error?.message ?? 'The page could not be created.' };
  }

  // Every page gets an SEO record up front so the editor always has a row to write to.
  await supabase.from('cms_seo').insert({ page_id: data.id, seo_title: parsed.data.title });

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'page.created',
    entityType: 'cms_page',
    entityId: data.id,
    summary: `Created the page "${parsed.data.title}" at /${parsed.data.slug}`,
  });

  revalidatePath('/admin/website');
  redirect(`/admin/website/${data.id}`);
}

export async function updatePageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const id = formData.get('id')?.toString();
  if (!id) return { ok: false, message: 'Missing page.' };

  const parsed = pageSchema.safeParse({
    title: formData.get('title') ?? '',
    slug: formData.get('slug') ?? '',
    status: formData.get('status') || 'draft',
    publish_at: formData.get('publish_at') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data: before } = await supabase.from('cms_pages').select('*').eq('id', id).maybeSingle();
  if (!before) return { ok: false, message: 'That page no longer exists.' };

  if (parsed.data.slug !== before.slug && RESERVED_SLUGS.has(parsed.data.slug)) {
    return { ok: false, errors: { slug: [`"${parsed.data.slug}" is used by the app itself. Choose another.`] } };
  }

  const scheduled = parsed.data.status === 'scheduled';
  if (scheduled && !parsed.data.publish_at) {
    return { ok: false, errors: { publish_at: ['Choose when this page should go live.'] } };
  }

  const isHome = formData.get('is_home') === 'on';

  // Only one page can be the homepage — clear the flag elsewhere first.
  if (isHome && !before.is_home) {
    await supabase.from('cms_pages').update({ is_home: false }).eq('is_home', true);
  }

  const { error } = await supabase
    .from('cms_pages')
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: parsed.data.status,
      is_home: isHome,
      publish_at: scheduled ? new Date(parsed.data.publish_at!).toISOString() : null,
      published_at:
        parsed.data.status === 'published' ? (before.published_at ?? new Date().toISOString()) : before.published_at,
      updated_by: admin.id,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') return { ok: false, errors: { slug: ['That URL is already taken.'] } };
    return { ok: false, message: error.message };
  }

  const statusChanged = before.status !== parsed.data.status;

  await recordAudit(supabase, {
    actorId: admin.id,
    action:
      statusChanged && parsed.data.status === 'published'
        ? 'page.published'
        : statusChanged && before.status === 'published'
          ? 'page.unpublished'
          : 'page.updated',
    entityType: 'cms_page',
    entityId: id,
    summary: `${statusChanged ? `Changed "${parsed.data.title}" from ${before.status} to ${parsed.data.status}` : `Updated "${parsed.data.title}"`}`,
    before: { status: before.status, slug: before.slug, title: before.title },
    after: { status: parsed.data.status, slug: parsed.data.slug, title: parsed.data.title },
  });

  revalidatePage(parsed.data.slug, isHome || before.is_home);
  revalidatePath(`/${before.slug}`);
  revalidatePath(`/admin/website/${id}`);

  return { ok: true, message: 'Page saved.' };
}

export async function deletePageAction(id: string): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from('cms_pages').select('*').eq('id', id).maybeSingle();

  if (!before) return { ok: false, message: 'That page no longer exists.' };
  if (before.is_home) {
    return { ok: false, message: 'This is the homepage. Make another page the homepage before deleting it.' };
  }

  const { error } = await supabase.from('cms_pages').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'page.deleted',
    entityType: 'cms_page',
    entityId: id,
    summary: `Deleted the page "${before.title}" (/${before.slug})`,
    before: before as unknown as Json,
  });

  revalidatePage(before.slug, false);
  return { ok: true, message: 'Page deleted.' };
}

/** Publish / unpublish from the page list without opening the editor. */
export async function togglePublishAction(id: string, publish: boolean): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('cms_pages')
    .select('title, slug, status, is_home, published_at')
    .eq('id', id)
    .maybeSingle();

  if (!before) return { ok: false, message: 'That page no longer exists.' };

  const { error } = await supabase
    .from('cms_pages')
    .update({
      status: publish ? 'published' : 'draft',
      published_at: publish ? (before.published_at ?? new Date().toISOString()) : before.published_at,
      updated_by: admin.id,
    })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };

  await recordAudit(supabase, {
    actorId: admin.id,
    action: publish ? 'page.published' : 'page.unpublished',
    entityType: 'cms_page',
    entityId: id,
    summary: `${publish ? 'Published' : 'Unpublished'} "${before.title}"`,
  });

  revalidatePage(before.slug, before.is_home);
  return { ok: true, message: publish ? 'Page published.' : 'Page unpublished.' };
}

// ------------------------------------------------------------------- blocks --
export async function addBlockAction(pageId: string, blockType: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  if (!getBlockDef(blockType)) return { ok: false, message: 'Unknown block type.' };

  const supabase = await createClient();

  const { data: last } = await supabase
    .from('cms_page_blocks')
    .select('position')
    .eq('page_id', pageId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('cms_page_blocks').insert({
    page_id: pageId,
    block_type: blockType,
    position: (last?.position ?? -1) + 1,
    data: defaultBlockData(blockType) as Record<string, Json>,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/website/${pageId}`);
  return { ok: true, message: 'Block added.' };
}

export async function updateBlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const raw = formData.get('payload')?.toString();
  if (!raw) return { ok: false, message: 'Nothing to save.' };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'The block data could not be read.' };
  }

  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  if (!parsed.data.id) return { ok: false, message: 'Missing block.' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('cms_page_blocks')
    .update({ data: parsed.data.data as Record<string, Json>, is_visible: parsed.data.is_visible })
    .eq('id', parsed.data.id);

  if (error) return { ok: false, message: error.message };

  await supabase.from('cms_pages').update({ updated_by: admin.id }).eq('id', parsed.data.page_id);

  const { data: page } = await supabase
    .from('cms_pages')
    .select('slug, is_home')
    .eq('id', parsed.data.page_id)
    .maybeSingle();

  if (page) revalidatePage(page.slug, page.is_home);
  revalidatePath(`/admin/website/${parsed.data.page_id}`);

  return { ok: true, message: 'Block saved.' };
}

export async function deleteBlockAction(blockId: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();

  const { data: block } = await supabase
    .from('cms_page_blocks')
    .select('page_id')
    .eq('id', blockId)
    .maybeSingle();

  const { error } = await supabase.from('cms_page_blocks').delete().eq('id', blockId);
  if (error) return { ok: false, message: error.message };

  if (block) {
    const { data: page } = await supabase
      .from('cms_pages')
      .select('slug, is_home')
      .eq('id', block.page_id)
      .maybeSingle();
    if (page) revalidatePage(page.slug, page.is_home);
    revalidatePath(`/admin/website/${block.page_id}`);
  }

  return { ok: true, message: 'Block removed.' };
}

/** Persists a new block order after a drag-and-drop. */
export async function reorderBlocksAction(pageId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const parsed = reorderSchema.safeParse({ page_id: pageId, ordered_ids: orderedIds });
  if (!parsed.success) return { ok: false, message: 'Invalid ordering.' };

  const supabase = await createClient();

  // Small lists, and each row needs its own position — a handful of updates is
  // cheaper than a round trip to build a bulk statement.
  const results = await Promise.all(
    parsed.data.ordered_ids.map((id, index) =>
      supabase.from('cms_page_blocks').update({ position: index }).eq('id', id).eq('page_id', pageId),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, message: failed.error.message };

  const { data: page } = await supabase.from('cms_pages').select('slug, is_home').eq('id', pageId).maybeSingle();
  if (page) revalidatePage(page.slug, page.is_home);
  revalidatePath(`/admin/website/${pageId}`);

  return { ok: true, message: 'Order saved.' };
}

// ---------------------------------------------------------------------- SEO --
export async function saveSeoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const parsed = seoSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    no_index: formData.get('no_index') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(parsed.error) };
  }

  const { page_id, keywords, ...values } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from('cms_seo').upsert(
    {
      page_id,
      seo_title: values.seo_title || null,
      meta_description: values.meta_description || null,
      canonical_url: values.canonical_url || null,
      og_title: values.og_title || null,
      og_description: values.og_description || null,
      og_image_url: values.og_image_url || null,
      og_image_alt: values.og_image_alt || null,
      twitter_card: values.twitter_card,
      twitter_title: values.twitter_title || null,
      twitter_description: values.twitter_description || null,
      twitter_image_url: values.twitter_image_url || null,
      no_index: values.no_index,
      keywords: keywords
        ? keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'page_id' },
  );

  if (error) return { ok: false, message: error.message };

  const { data: page } = await supabase.from('cms_pages').select('slug, is_home, title').eq('id', page_id).maybeSingle();

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'page.updated',
    entityType: 'cms_seo',
    entityId: page_id,
    summary: `Updated SEO for "${page?.title ?? 'a page'}"`,
  });

  if (page) revalidatePage(page.slug, page.is_home);
  revalidatePath(`/admin/website/${page_id}`);

  return { ok: true, message: 'SEO settings saved.' };
}

// ---------------------------------------------------------------- revisions --
/** Snapshots the page as it stands, so an editor can roll back to it later. */
export async function snapshotPageAction(pageId: string, note?: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('snapshot_cms_page', {
    p_page_id: pageId,
    p_note: note ?? null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/website/${pageId}`);
  return { ok: true, message: `Saved as version ${data}.` };
}

/** Restores a page's blocks and SEO from an earlier snapshot. */
export async function revertToRevisionAction(revisionId: string): Promise<ActionResult> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();

  const { data: revision } = await supabase
    .from('cms_revisions')
    .select('page_id, version, snapshot')
    .eq('id', revisionId)
    .maybeSingle();

  if (!revision) return { ok: false, message: 'That version no longer exists.' };

  const snapshot = revision.snapshot as {
    page?: Record<string, Json>;
    blocks?: { block_type: string; position: number; data: Record<string, Json>; is_visible: boolean }[];
    seo?: Record<string, Json> | null;
  };

  // Take a snapshot of the current state first, so reverting is itself undoable.
  await supabase.rpc('snapshot_cms_page', {
    p_page_id: revision.page_id,
    p_note: `Automatic backup before reverting to version ${revision.version}`,
  });

  await supabase.from('cms_page_blocks').delete().eq('page_id', revision.page_id);

  if (snapshot.blocks?.length) {
    const { error } = await supabase.from('cms_page_blocks').insert(
      snapshot.blocks.map((block, index) => ({
        page_id: revision.page_id,
        block_type: block.block_type,
        position: block.position ?? index,
        data: block.data ?? {},
        is_visible: block.is_visible ?? true,
      })),
    );
    if (error) return { ok: false, message: error.message };
  }

  if (snapshot.seo) {
    const { id: _ignored, ...seo } = snapshot.seo as Record<string, Json>;
    await supabase.from('cms_seo').upsert({ ...seo, page_id: revision.page_id }, { onConflict: 'page_id' });
  }

  const { data: page } = await supabase
    .from('cms_pages')
    .select('slug, is_home, title')
    .eq('id', revision.page_id)
    .maybeSingle();

  await recordAudit(supabase, {
    actorId: admin.id,
    action: 'page.reverted',
    entityType: 'cms_page',
    entityId: revision.page_id,
    summary: `Reverted "${page?.title ?? 'a page'}" to version ${revision.version}`,
  });

  if (page) revalidatePage(page.slug, page.is_home);
  revalidatePath(`/admin/website/${revision.page_id}`);

  return { ok: true, message: `Reverted to version ${revision.version}.` };
}

// -------------------------------------------------------------------- media --
export async function uploadMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let admin;
  try {
    admin = await assertRole([...ADMIN]);
  } catch (error) {
    return failure(error);
  }

  const file = optionalFile(formData, 'file');
  if (!file) return { ok: false, errors: { file: ['Choose an image to upload.'] } };

  const altText = formData.get('alt_text')?.toString().trim() ?? '';
  const folder = formData.get('folder')?.toString().trim() || 'general';

  const supabase = await createClient();

  try {
    const upload = await uploadFile(supabase, {
      bucket: 'public-media',
      folder: slugify(folder) || 'general',
      file,
      allowedTypes: IMAGE_TYPES,
      maxBytes: MAX_IMAGE_BYTES,
      isPublicBucket: true,
    });

    const { error } = await supabase.from('media').insert({
      bucket: upload.bucket,
      path: upload.path,
      url: upload.publicUrl,
      filename: file.name,
      mime_type: upload.mimeType,
      size_bytes: upload.size,
      alt_text: altText || null,
      folder: slugify(folder) || 'general',
      is_public: true,
      uploaded_by: admin.id,
    });

    if (error) {
      await removeFile(supabase, upload.bucket, upload.path);
      return { ok: false, message: error.message };
    }
  } catch (error) {
    return { ok: false, errors: { file: [error instanceof Error ? error.message : 'Upload failed.'] } };
  }

  revalidatePath('/admin/media');
  return { ok: true, message: 'Image uploaded.' };
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();
  const { data: media } = await supabase.from('media').select('bucket, path').eq('id', id).maybeSingle();

  const { error } = await supabase.from('media').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  if (media) await removeFile(supabase, media.bucket, media.path);

  revalidatePath('/admin/media');
  return { ok: true, message: 'Image deleted.' };
}

export async function updateMediaAltAction(id: string, altText: string): Promise<ActionResult> {
  try {
    await assertRole([...ADMIN]);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'That did not work.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('media')
    .update({ alt_text: altText.trim().slice(0, 200) || null })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/media');
  return { ok: true, message: 'Alt text saved.' };
}
