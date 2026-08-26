-- ============================================================================
-- Roti Ghar — Row Level Security
--
-- Every table below has RLS enabled. Nothing is reachable from the browser
-- unless a policy explicitly allows it. Client-side checks are convenience
-- only; these policies are the real access control.
-- ============================================================================

-- Baseline grants. RLS still decides which *rows* are visible.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant insert on public.support_pledges to anon;

alter table public.profiles             enable row level security;
alter table public.profile_contacts     enable row level security;
alter table public.member_applications  enable row level security;
alter table public.posts                enable row level security;
alter table public.post_media           enable row level security;
alter table public.likes                enable row level security;
alter table public.comments             enable row level security;
alter table public.comment_likes        enable row level security;
alter table public.mentions             enable row level security;
alter table public.notifications        enable row level security;
alter table public.reports              enable row level security;
alter table public.point_transactions   enable row level security;
alter table public.member_of_month      enable row level security;
alter table public.beneficiaries        enable row level security;
alter table public.ration_kits          enable row level security;
alter table public.ration_kit_items     enable row level security;
alter table public.distributions        enable row level security;
alter table public.contributions        enable row level security;
alter table public.expenses             enable row level security;
alter table public.documents            enable row level security;
alter table public.reminders            enable row level security;
alter table public.reminder_recipients  enable row level security;
alter table public.cms_pages            enable row level security;
alter table public.cms_page_blocks      enable row level security;
alter table public.cms_seo              enable row level security;
alter table public.cms_revisions        enable row level security;
alter table public.media                enable row level security;
alter table public.site_settings        enable row level security;
alter table public.support_pledges      enable row level security;
alter table public.audit_logs           enable row level security;

-- ---------------------------------------------------------------- profiles --
-- Approved members can see each other's public profile fields. Pending,
-- rejected and suspended accounts can only ever see themselves.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (status = 'active' and public.is_active_member())
  );

create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_delete_admin on public.profiles for delete to authenticated
  using (public.is_admin());

-- A member may edit their own profile, but role / status / points / approval
-- are privileged. RLS cannot compare OLD and NEW, so a trigger locks them.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role            := old.role;
  new.status          := old.status;
  new.points          := old.points;
  new.posts_count     := old.posts_count;
  new.approved_at     := old.approved_at;
  new.approved_by     := old.approved_by;
  new.joined_at       := old.joined_at;
  new.suspended_until := old.suspended_until;
  new.referred_by     := old.referred_by;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ------------------------------------------------------- profile_contacts --
-- Phone, address and application notes: owner and admins only. This is why the
-- data lives in its own table — no member-facing query can reach it.
create policy profile_contacts_select on public.profile_contacts for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy profile_contacts_insert on public.profile_contacts for insert to authenticated
  with check (profile_id = auth.uid() or public.is_admin());

create policy profile_contacts_update on public.profile_contacts for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy profile_contacts_delete on public.profile_contacts for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------- member_applications --
create policy applications_select on public.member_applications for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy applications_insert on public.member_applications for insert to authenticated
  with check (profile_id = auth.uid());

create policy applications_update_admin on public.member_applications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy applications_delete_admin on public.member_applications for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------ posts --
create policy posts_select on public.posts for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_member() and (status = 'published' or author_id = auth.uid()))
  );

create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_member()
    and (is_announcement = false or public.is_admin())
    and (is_pinned = false or public.is_admin())
  );

create policy posts_update on public.posts for update to authenticated
  using ((author_id = auth.uid() and public.is_active_member()) or public.is_admin())
  with check (
    public.is_admin()
    or (author_id = auth.uid() and is_announcement = false and is_pinned = false)
  );

create policy posts_delete on public.posts for delete to authenticated
  using ((author_id = auth.uid() and public.is_active_member()) or public.is_admin());

-- ------------------------------------------------------------- post_media --
create policy post_media_select on public.post_media for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and (public.is_active_member() or public.is_admin())
  );

create policy post_media_insert on public.post_media for insert to authenticated
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    and public.is_active_member()
  );

create policy post_media_delete on public.post_media for delete to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- ------------------------------------------------------------------ likes --
create policy likes_select on public.likes for select to authenticated
  using (public.is_active_member() or public.is_admin());

create policy likes_insert on public.likes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_member());

create policy likes_delete on public.likes for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- --------------------------------------------------------------- comments --
create policy comments_select on public.comments for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_member() and (status = 'published' or author_id = auth.uid()))
  );

create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_member()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );

create policy comments_update on public.comments for update to authenticated
  using ((author_id = auth.uid() and public.is_active_member()) or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy comments_delete on public.comments for delete to authenticated
  using ((author_id = auth.uid() and public.is_active_member()) or public.is_admin());

-- ---------------------------------------------------------- comment_likes --
create policy comment_likes_select on public.comment_likes for select to authenticated
  using (public.is_active_member() or public.is_admin());

create policy comment_likes_insert on public.comment_likes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_member());

create policy comment_likes_delete on public.comment_likes for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- --------------------------------------------------------------- mentions --
create policy mentions_select on public.mentions for select to authenticated
  using (public.is_active_member() or public.is_admin());

create policy mentions_insert on public.mentions for insert to authenticated
  with check (actor_id = auth.uid() and public.is_active_member());

create policy mentions_delete on public.mentions for delete to authenticated
  using (actor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------- notifications --
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- A member can only raise notifications attributed to themselves (a like, a
-- comment, a mention). Admin broadcasts go through dispatch_reminder(), which
-- is SECURITY DEFINER.
create policy notifications_insert on public.notifications for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_active_member() and actor_id = auth.uid())
  );

create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- reports --
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_member());

create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reports_delete_admin on public.reports for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------- point_transactions --
-- Members see their own ledger. Leaderboards go through leaderboard(), which is
-- SECURITY DEFINER, so no member needs to read anybody else's rows.
create policy point_tx_select on public.point_transactions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy point_tx_write_admin on public.point_transactions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- member_of_month --
create policy mom_select on public.member_of_month for select to anon, authenticated
  using (true);

create policy mom_write_admin on public.member_of_month for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- beneficiaries --
-- Families receiving aid. Never visible to ordinary members or the public.
create policy beneficiaries_select on public.beneficiaries for select to authenticated
  using (public.is_volunteer());

create policy beneficiaries_insert on public.beneficiaries for insert to authenticated
  with check (public.is_volunteer());

create policy beneficiaries_update on public.beneficiaries for update to authenticated
  using (public.is_volunteer()) with check (public.is_volunteer());

create policy beneficiaries_delete on public.beneficiaries for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------ ration kits --
create policy ration_kits_select on public.ration_kits for select to authenticated
  using (public.is_active_member());

create policy ration_kits_write on public.ration_kits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy ration_kit_items_select on public.ration_kit_items for select to authenticated
  using (public.is_active_member());

create policy ration_kit_items_write on public.ration_kit_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- distributions --
create policy distributions_select on public.distributions for select to authenticated
  using (public.is_volunteer());

create policy distributions_insert on public.distributions for insert to authenticated
  with check (public.is_volunteer());

create policy distributions_update on public.distributions for update to authenticated
  using (public.is_volunteer()) with check (public.is_volunteer());

create policy distributions_delete on public.distributions for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------- contributions --
-- Contributors may see their own record; the ledger itself is admin-only.
create policy contributions_select on public.contributions for select to authenticated
  using (public.is_admin() or contributor_id = auth.uid());

create policy contributions_insert on public.contributions for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_volunteer() and verification_status = 'pending')
  );

create policy contributions_update_admin on public.contributions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy contributions_delete_admin on public.contributions for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- expenses --
create policy expenses_select on public.expenses for select to authenticated
  using (public.is_admin() or (public.is_volunteer() and created_by = auth.uid()));

create policy expenses_insert on public.expenses for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_volunteer() and verification_status = 'pending' and created_by = auth.uid())
  );

create policy expenses_update_admin on public.expenses for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy expenses_delete_admin on public.expenses for delete to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------- documents --
create policy documents_select on public.documents for select to authenticated
  using (public.is_admin() or (is_private = false and public.is_active_member()));

create policy documents_write_admin on public.documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------- reminders --
create policy reminders_select on public.reminders for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.reminder_recipients rr
       where rr.reminder_id = id and rr.profile_id = auth.uid()
    )
  );

create policy reminders_write_admin on public.reminders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reminder_recipients_select on public.reminder_recipients for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy reminder_recipients_update_own on public.reminder_recipients for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy reminder_recipients_write_admin on public.reminder_recipients for insert to authenticated
  with check (public.is_admin());

create policy reminder_recipients_delete_admin on public.reminder_recipients for delete to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------------- CMS --
-- The public website is rendered with the anon key, so anonymous visitors must
-- be able to read published pages — and only those.
create policy cms_pages_public_select on public.cms_pages for select to anon, authenticated
  using (
    status = 'published'
    or (status = 'scheduled' and publish_at is not null and publish_at <= now())
  );

create policy cms_pages_admin_all on public.cms_pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy cms_blocks_public_select on public.cms_page_blocks for select to anon, authenticated
  using (
    is_visible
    and exists (
      select 1 from public.cms_pages p
       where p.id = page_id
         and (p.status = 'published'
              or (p.status = 'scheduled' and p.publish_at is not null and p.publish_at <= now()))
    )
  );

create policy cms_blocks_admin_all on public.cms_page_blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy cms_seo_public_select on public.cms_seo for select to anon, authenticated
  using (
    exists (
      select 1 from public.cms_pages p
       where p.id = page_id
         and (p.status = 'published'
              or (p.status = 'scheduled' and p.publish_at is not null and p.publish_at <= now()))
    )
  );

create policy cms_seo_admin_all on public.cms_seo for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy cms_revisions_admin on public.cms_revisions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ media --
create policy media_public_select on public.media for select to anon, authenticated
  using (is_public or public.is_admin());

create policy media_write_admin on public.media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- site_settings --
create policy site_settings_public_select on public.site_settings for select to anon, authenticated
  using (is_public or public.is_admin());

create policy site_settings_write_admin on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------- support_pledges --
-- Anyone may offer support through the public form; only admins can read them.
create policy support_pledges_insert_public on public.support_pledges for insert to anon, authenticated
  with check (true);

create policy support_pledges_select_admin on public.support_pledges for select to authenticated
  using (public.is_admin());

create policy support_pledges_update_admin on public.support_pledges for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy support_pledges_delete_admin on public.support_pledges for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------- audit_logs --
-- Append-only: rows are written by SECURITY DEFINER functions, never directly,
-- and there is deliberately no UPDATE or DELETE policy.
create policy audit_logs_select_admin on public.audit_logs for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------- public impact metrics --
-- Aggregates for the public homepage. SECURITY DEFINER so anonymous visitors
-- get counts without any read access to the underlying private tables.
create or replace function public.impact_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'families_helped',   (select count(distinct beneficiary_id) from public.distributions),
    'kits_distributed',  (select coalesce(sum(quantity), 0) from public.distributions),
    'distributions',     (select count(*) from public.distributions),
    'active_members',    (select count(*) from public.profiles where status = 'active'),
    'volunteers',        (select count(*) from public.profiles where status = 'active' and role in ('volunteer','admin')),
    'areas_served',      (select count(distinct area) from public.beneficiaries where area is not null)
  );
$$;

grant execute on function public.impact_stats() to anon, authenticated;
