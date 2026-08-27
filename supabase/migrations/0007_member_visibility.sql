-- ============================================================================
-- Roti Ghar — member-facing transparency, admin-only writes
--
-- Two changes, both at the policy layer. No new tables, no new columns: the
-- schema in 0001 already carries everything the dashboard needs.
--
--  1. Approved members may now READ the contribution ledger, the families who
--     received ration, and the distribution records. Until now those were
--     restricted to volunteers and administrators.
--
--  2. Every WRITE to contributions, expenses, distributions and beneficiaries
--     is now administrator-only. Previously a volunteer could file a pending
--     contribution or expense and record a distribution; the admin screens
--     that expose those forms already call requireAdmin(), so this closes the
--     gap between what the UI allows and what the database allows.
--
-- Policies are dropped and recreated rather than altered so this migration is
-- safe to run against a database already carrying 0003.
-- ============================================================================

-- ---------------------------------------------------------- contributions --
-- Read: any approved member sees the verified ledger — who gave, how much and
-- when. A contributor always sees their own rows whatever the status, so a
-- pending entry of their own is never invisible to them. Only administrators
-- see other people's pending or rejected paperwork; publishing an unverified
-- figure to the whole membership would misrepresent the balance, which counts
-- verified rows only.
drop policy if exists contributions_select on public.contributions;
create policy contributions_select on public.contributions for select to authenticated
  using (
    public.is_admin()
    or contributor_id = auth.uid()
    or (public.is_active_member() and verification_status = 'verified')
  );

drop policy if exists contributions_insert on public.contributions;
create policy contributions_insert on public.contributions for insert to authenticated
  with check (public.is_admin());

-- update / delete were already administrator-only in 0003; restated here so
-- the whole table's write surface is legible in one place.
drop policy if exists contributions_update_admin on public.contributions;
create policy contributions_update_admin on public.contributions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists contributions_delete_admin on public.contributions;
create policy contributions_delete_admin on public.contributions for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- expenses --
-- Members read the expense ledger so the balance shown on the dashboard can be
-- traced to real records. Unverified expenses stay with administrators, for
-- the same reason as contributions above.
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_member() and verification_status = 'verified')
  );

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.is_admin());

drop policy if exists expenses_update_admin on public.expenses;
create policy expenses_update_admin on public.expenses for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists expenses_delete_admin on public.expenses;
create policy expenses_delete_admin on public.expenses for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------- beneficiaries --
-- Approved members may now see the families the kitchen serves. Note what this
-- deliberately does NOT change: `phone` and `address` remain columns on this
-- table, and RLS cannot hide individual columns — so every member-facing query
-- in the application selects name, area and family_size only. The admin
-- screens are the only place the contact columns are ever read.
drop policy if exists beneficiaries_select on public.beneficiaries;
create policy beneficiaries_select on public.beneficiaries for select to authenticated
  using (public.is_active_member());

drop policy if exists beneficiaries_insert on public.beneficiaries;
create policy beneficiaries_insert on public.beneficiaries for insert to authenticated
  with check (public.is_admin());

drop policy if exists beneficiaries_update on public.beneficiaries;
create policy beneficiaries_update on public.beneficiaries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- beneficiaries_delete was already administrator-only.

-- ---------------------------------------------------------- distributions --
drop policy if exists distributions_select on public.distributions;
create policy distributions_select on public.distributions for select to authenticated
  using (public.is_active_member());

drop policy if exists distributions_insert on public.distributions;
create policy distributions_insert on public.distributions for insert to authenticated
  with check (public.is_admin());

drop policy if exists distributions_update on public.distributions;
create policy distributions_update on public.distributions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- distributions_delete was already administrator-only.

-- ------------------------------------------------------------------ storage --
-- Receipt and proof files stay exactly as private as they were: members gain
-- read access to the distribution *rows*, never to the attached images. Only
-- the upload policies move, from volunteer to administrator, so that storage
-- agrees with the table policies above.
drop policy if exists "receipts write" on storage.objects;
create policy "receipts write" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "proofs write" on storage.objects;
create policy "proofs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and public.is_admin());
