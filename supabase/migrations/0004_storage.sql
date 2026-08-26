-- ============================================================================
-- Roti Ghar — Storage buckets and object policies
--
-- Public buckets:  public-media (CMS/gallery), avatars (profile pictures)
-- Private buckets: community (member posts), receipts, documents, proofs
-- Private objects are only ever served through short-lived signed URLs.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true,  10485760,
     array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']),
  ('avatars',      'avatars',      true,   5242880,
     array['image/jpeg','image/png','image/webp','image/avif']),
  ('community',    'community',    false, 52428800,
     array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']),
  ('receipts',     'receipts',     false, 10485760,
     array['image/jpeg','image/png','image/webp','application/pdf']),
  ('documents',    'documents',    false, 26214400, null),
  ('proofs',       'proofs',       false, 10485760,
     array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------- public-media
create policy "public-media read"   on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy "public-media write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_admin());
create policy "public-media update" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.is_admin());
create policy "public-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_admin());

-- -------------------------------------------------------------------- avatars
-- Objects are stored under `<user-id>/<file>`, so the first path segment is the
-- owner and a member can only ever write into their own folder.
create policy "avatars read"   on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "avatars write"  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "avatars update" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "avatars delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ------------------------------------------------------------------ community
-- Private: only approved members can read post media, and only through a
-- signed URL generated on the server.
create policy "community read"   on storage.objects for select to authenticated
  using (bucket_id = 'community' and (public.is_active_member() or public.is_admin()));
create policy "community write"  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community'
    and public.is_active_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "community delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'community'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ------------------------------------------------------------------- receipts
create policy "receipts read"   on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_admin());
create policy "receipts write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_volunteer());
create policy "receipts update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and public.is_admin());
create policy "receipts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

-- ------------------------------------------------------------------ documents
create policy "documents read"   on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());
create policy "documents write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin());
create policy "documents update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_admin());
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- --------------------------------------------------------------------- proofs
create policy "proofs read"   on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and public.is_volunteer());
create policy "proofs write"  on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and public.is_volunteer());
create policy "proofs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and public.is_admin());
