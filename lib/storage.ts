import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { storagePath } from '@/lib/utils';

type Client = SupabaseClient<Database>;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const DOC_TYPES = ['application/pdf', ...IMAGE_TYPES];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_DOC_BYTES = 25 * 1024 * 1024;

export interface UploadResult {
  bucket: string;
  path: string;
  publicUrl: string | null;
  mimeType: string;
  size: number;
}

/**
 * Validates a browser File and puts it in a bucket.
 *
 * The MIME type and size are checked here *and* by the bucket's own
 * `allowed_mime_types` / `file_size_limit` in Postgres, so a forged request
 * that skips this function still cannot land an arbitrary file.
 */
export async function uploadFile(
  supabase: Client,
  {
    bucket,
    folder,
    file,
    allowedTypes = IMAGE_TYPES,
    maxBytes = MAX_IMAGE_BYTES,
    isPublicBucket = false,
  }: {
    bucket: string;
    folder: string;
    file: File;
    allowedTypes?: string[];
    maxBytes?: number;
    isPublicBucket?: boolean;
  },
): Promise<UploadResult> {
  if (!file || file.size === 0) throw new Error('No file was provided.');

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`That file type is not allowed here. Accepted: ${allowedTypes.join(', ')}.`);
  }

  if (file.size > maxBytes) {
    throw new Error(`That file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const path = storagePath(folder, file.name || 'upload');

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const publicUrl = isPublicBucket
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : null;

  return { bucket, path, publicUrl, mimeType: file.type, size: file.size };
}

/**
 * Short-lived signed URL for an object in a private bucket.
 *
 * Receipts, distribution proofs, documents and member post media are never
 * public — they are only ever handed out as one of these, and the caller's own
 * session decides whether storage RLS lets them generate it at all.
 */
export async function signedUrl(
  supabase: Client,
  bucket: string,
  path: string | null | undefined,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Signs a batch of paths in one round trip per bucket. */
export async function signedUrls(
  supabase: Client,
  bucket: string,
  paths: string[],
  expiresInSeconds = 60 * 10,
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function removeFile(supabase: Client, bucket: string, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

/** Returns the file only when the form actually carried one. */
export function optionalFile(formData: FormData, field: string): File | null {
  const value = formData.get(field);
  if (!(value instanceof File)) return null;
  if (value.size === 0 || !value.name) return null;
  return value;
}
