-- ============================================================================
-- Roti Ghar — helper functions, counters and triggers
-- ============================================================================

-- ------------------------------------------------------- authorization helpers
-- SECURITY DEFINER so they bypass RLS on `profiles`; without this, a policy on
-- `profiles` that calls these would recurse infinitely.

create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_status()
returns user_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_volunteer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'volunteer') and status = 'active'
  );
$$;

-- Any approved member (member, volunteer or admin) whose account is active.
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

grant execute on function public.current_role()    to authenticated;
grant execute on function public.current_status()  to authenticated;
grant execute on function public.is_admin()        to authenticated;
grant execute on function public.is_volunteer()    to authenticated;
grant execute on function public.is_active_member() to authenticated;

-- ------------------------------------------------------------- updated_at bump
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'profile_contacts', 'member_applications', 'posts', 'comments',
    'beneficiaries', 'ration_kits', 'distributions', 'contributions', 'expenses',
    'reminders', 'cms_pages', 'cms_page_blocks'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------ new auth user handler
-- Creates the profile + private contact row + membership application whenever a
-- user signs up. Runs as definer so it can write before the user has a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name      text  := nullif(trim(coalesce(meta->>'full_name', '')), '');
  v_referrer  uuid;
begin
  if v_name is null then
    v_name := split_part(new.email, '@', 1);
  end if;

  begin
    v_referrer := nullif(meta->>'referred_by', '')::uuid;
  exception when others then
    v_referrer := null;
  end;

  insert into public.profiles (id, full_name, role, status, referred_by)
  values (new.id, left(v_name, 120), 'member', 'pending', v_referrer)
  on conflict (id) do nothing;

  insert into public.profile_contacts (profile_id, email, mobile, address, reference, referred_by_name, reason)
  values (
    new.id,
    new.email,
    nullif(meta->>'mobile', ''),
    nullif(meta->>'address', ''),
    nullif(meta->>'reference', ''),
    nullif(meta->>'referred_by_name', ''),
    nullif(meta->>'reason', '')
  )
  on conflict (profile_id) do nothing;

  insert into public.member_applications
    (profile_id, full_name, email, mobile, address, reference, referred_by_name, referred_by, reason, status)
  values (
    new.id,
    left(v_name, 120),
    new.email,
    nullif(meta->>'mobile', ''),
    nullif(meta->>'address', ''),
    nullif(meta->>'reference', ''),
    nullif(meta->>'referred_by_name', ''),
    v_referrer,
    nullif(meta->>'reason', ''),
    'pending'
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- engagement counters
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger likes_sync_count
  after insert or delete on public.likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

create trigger comment_likes_sync_count
  after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_like_count();

create or replace function public.sync_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    if new.parent_id is not null then
      update public.comments set reply_count = reply_count + 1 where id = new.parent_id;
    end if;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    if old.parent_id is not null then
      update public.comments set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger comments_sync_counts
  after insert or delete on public.comments
  for each row execute function public.sync_comment_counts();

create or replace function public.sync_posts_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.author_id;
  end if;
  return null;
end;
$$;

create trigger posts_sync_author_count
  after insert or delete on public.posts
  for each row execute function public.sync_posts_count();

-- --------------------------------------------------------------- points ledger
-- `profiles.points` is always the sum of that member's verified transactions.
create or replace function public.sync_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.profile_id, old.profile_id);
begin
  update public.profiles p
     set points = coalesce((
       select sum(pt.points)
         from public.point_transactions pt
        where pt.profile_id = target and pt.is_verified
     ), 0)
   where p.id = target;
  return null;
end;
$$;

create trigger point_transactions_sync
  after insert or update or delete on public.point_transactions
  for each row execute function public.sync_profile_points();

-- ------------------------------------------------------------- CMS revisions
-- Snapshot a page (with blocks + SEO) into cms_revisions and bump its version.
create or replace function public.snapshot_cms_page(p_page_id uuid, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_snap jsonb;
begin
  if not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;

  select coalesce(max(version), 0) + 1 into v_next
    from public.cms_revisions where page_id = p_page_id;

  select jsonb_build_object(
    'page',   to_jsonb(pg) - 'created_at' - 'updated_at',
    'blocks', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.position)
        from public.cms_page_blocks b where b.page_id = p_page_id
    ), '[]'::jsonb),
    'seo',    (select to_jsonb(s) from public.cms_seo s where s.page_id = p_page_id)
  ) into v_snap
  from public.cms_pages pg
  where pg.id = p_page_id;

  if v_snap is null then
    raise exception 'page_not_found';
  end if;

  insert into public.cms_revisions (page_id, version, note, snapshot, created_by)
  values (p_page_id, v_next, p_note, v_snap, auth.uid());

  update public.cms_pages set version = v_next where id = p_page_id;
  return v_next;
end;
$$;

grant execute on function public.snapshot_cms_page(uuid, text) to authenticated;

-- ------------------------------------------------------------ finance summary
-- Balance = verified contributions − verified expenses.
create or replace function public.finance_summary()
returns table (total_received numeric, total_spent numeric, balance numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(amount) from public.contributions where verification_status = 'verified'), 0) as total_received,
    coalesce((select sum(amount) from public.expenses      where verification_status = 'verified'), 0) as total_spent,
    coalesce((select sum(amount) from public.contributions where verification_status = 'verified'), 0)
      - coalesce((select sum(amount) from public.expenses  where verification_status = 'verified'), 0) as balance;
$$;

revoke execute on function public.finance_summary() from anon, authenticated;
grant execute on function public.finance_summary() to authenticated;

-- ----------------------------------------------------------- leaderboard view
-- Verified points aggregated per member over an arbitrary window.
create or replace function public.leaderboard(
  p_category point_category default null,
  p_since    timestamptz     default null,
  p_limit    integer         default 20
)
returns table (
  profile_id uuid,
  full_name  text,
  avatar_url text,
  role       user_role,
  points     bigint,
  activities bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.full_name,
         p.avatar_url,
         p.role,
         sum(pt.points)::bigint  as points,
         count(*)::bigint        as activities
    from public.point_transactions pt
    join public.profiles p on p.id = pt.profile_id
   where pt.is_verified
     and p.status = 'active'
     and (p_category is null or pt.category = p_category)
     and (p_since    is null or pt.occurred_at >= p_since)
   group by p.id, p.full_name, p.avatar_url, p.role
  having sum(pt.points) > 0
   order by points desc, activities desc, p.full_name asc
   limit greatest(coalesce(p_limit, 20), 1);
$$;

grant execute on function public.leaderboard(point_category, timestamptz, integer) to authenticated;

-- --------------------------------------------------------------- audit helper
create or replace function public.write_audit_log(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_summary     text default null,
  p_before      jsonb default null,
  p_after       jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary, before, after)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, p_before, p_after)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.write_audit_log(text, text, uuid, text, jsonb, jsonb) to authenticated;

-- ------------------------------------------------------- reminder fan-out
-- Materialises reminder_recipients for the chosen audience and notifies them.
create or replace function public.dispatch_reminder(p_reminder_id uuid, p_profile_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminder public.reminders;
  v_count    integer := 0;
begin
  if not public.is_admin() then
    raise exception 'insufficient_privilege';
  end if;

  select * into v_reminder from public.reminders where id = p_reminder_id;
  if v_reminder is null then
    raise exception 'reminder_not_found';
  end if;

  insert into public.reminder_recipients (reminder_id, profile_id)
  select p_reminder_id, p.id
    from public.profiles p
   where p.status = 'active'
     and case v_reminder.audience
           when 'all'        then true
           when 'members'    then p.role = 'member'
           when 'volunteers' then p.role = 'volunteer'
           when 'admins'     then p.role = 'admin'
           when 'selected'   then p.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
         end
  on conflict (reminder_id, profile_id) do nothing;

  get diagnostics v_count = row_count;

  insert into public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  select rr.profile_id, auth.uid(), 'reminder', v_reminder.title, v_reminder.body,
         '/reminders', 'reminder', p_reminder_id
    from public.reminder_recipients rr
   where rr.reminder_id = p_reminder_id;

  update public.reminders
     set status = 'sent', sent_at = now()
   where id = p_reminder_id;

  return v_count;
end;
$$;

grant execute on function public.dispatch_reminder(uuid, uuid[]) to authenticated;

-- ----------------------------------------------------- distribution points
-- Recording a distribution credits the volunteer who delivered it. Runs as a
-- definer trigger because `point_transactions` is admin-write under RLS — a
-- volunteer must not be able to award themselves points directly.
create or replace function public.award_distribution_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  if new.distributed_by is null then
    return null;
  end if;

  select coalesce((value->>'distribution')::integer, 10)
    into v_points
    from public.site_settings
   where key = 'points_rules';

  v_points := coalesce(v_points, 10) * greatest(new.quantity, 1);

  insert into public.point_transactions
    (profile_id, points, category, reason, activity_type, reference_type, reference_id, is_verified, awarded_by, occurred_at)
  values (
    new.distributed_by,
    v_points,
    'volunteer',
    'Ration distribution recorded',
    'distribution',
    'distribution',
    new.id,
    true,
    auth.uid(),
    new.distributed_on::timestamptz
  );

  return null;
end;
$$;

create trigger distributions_award_points
  after insert on public.distributions
  for each row execute function public.award_distribution_points();

-- Deleting a distribution removes the points it earned, so the ledger and the
-- records never disagree.
create or replace function public.revoke_distribution_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.point_transactions
   where reference_type = 'distribution' and reference_id = old.id;
  return null;
end;
$$;

create trigger distributions_revoke_points
  after delete on public.distributions
  for each row execute function public.revoke_distribution_points();

-- ---------------------------------------------- contribution verification
-- Verifying a member's contribution credits them; un-verifying takes it back.
create or replace function public.sync_contribution_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  delete from public.point_transactions
   where reference_type = 'contribution' and reference_id = new.id;

  if new.verification_status = 'verified' and new.contributor_id is not null then
    select coalesce((value->>'verified_contribution')::integer, 5)
      into v_points
      from public.site_settings
     where key = 'points_rules';

    insert into public.point_transactions
      (profile_id, points, category, reason, activity_type, reference_type, reference_id, is_verified, awarded_by, occurred_at)
    values (
      new.contributor_id,
      coalesce(v_points, 5),
      'contribution',
      'Verified contribution',
      'contribution',
      'contribution',
      new.id,
      true,
      auth.uid(),
      new.contributed_on::timestamptz
    );
  end if;

  return null;
end;
$$;

create trigger contributions_sync_points
  after insert or update of verification_status, contributor_id on public.contributions
  for each row execute function public.sync_contribution_points();
