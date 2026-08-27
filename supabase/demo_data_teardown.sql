-- ============================================================================
-- Roti Ghar — remove the demo data
--
-- Undoes `supabase/migrations/0008_demo_data.sql` completely. Everything that
-- migration created carries a recognisable id prefix, so nothing real is
-- touched: your own account, your own records and the 0005 seed content all
-- survive.
--
-- Deliberately NOT in migrations/ — it is a tool you run when you want it, not
-- a step in setting the database up.
--
-- Run it in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------- dry run --
-- Run this on its own first to see exactly what the delete below will remove.
-- Every count should match the demo set: 8 accounts, 10 families, 24
-- distributions, 20 contributions, 16 expenses. If a number is larger than you
-- expect, stop — something real shares the prefix.
--
--   select 'accounts'      as what, count(*) from auth.users            where id::text like 'd0d0d0d0-0000-4000-8000-%'
--   union all select 'beneficiaries',  count(*) from public.beneficiaries where id::text like 'beef0000-0000-4000-8000-%'
--   union all select 'distributions',  count(*) from public.distributions where id::text like 'd15d0001-0000-4000-8000-%'
--   union all select 'contributions',  count(*) from public.contributions where id::text like 'c0ff0000-0000-4000-8000-%'
--   union all select 'expenses',       count(*) from public.expenses      where id::text like 'e0e00000-0000-4000-8000-%'
--   union all select 'ration kits',    count(*) from public.ration_kits   where id::text like 'd15d0000-0000-4000-8000-%'
--   union all select 'member of month',count(*) from public.member_of_month where id::text like 'd0d0beef-0000-4000-8000-%';

begin;

-- Points first.
--
-- Both tables now revoke their own points on delete — `distributions` via
-- revoke_distribution_points (0002) and `contributions` via
-- revoke_contribution_points (0009). These two statements are therefore
-- belt-and-braces: they keep the teardown correct on a database where 0009
-- has not been applied, and are a harmless no-op where it has.
delete from public.point_transactions
 where reference_type = 'distribution'
   and reference_id::text like 'd15d0001-0000-4000-8000-%';

delete from public.point_transactions
 where reference_type = 'contribution'
   and reference_id::text like 'c0ff0000-0000-4000-8000-%';

-- Ledger and records. Distributions go before beneficiaries and kits, which
-- they reference with ON DELETE RESTRICT.
delete from public.distributions  where id::text like 'd15d0001-0000-4000-8000-%';
delete from public.contributions  where id::text like 'c0ff0000-0000-4000-8000-%';
delete from public.expenses       where id::text like 'e0e00000-0000-4000-8000-%';
delete from public.beneficiaries  where id::text like 'beef0000-0000-4000-8000-%';

delete from public.ration_kit_items where kit_id::text like 'd15d0000-0000-4000-8000-%';
delete from public.ration_kits      where id::text     like 'd15d0000-0000-4000-8000-%';

delete from public.member_of_month  where id::text like 'd0d0beef-0000-4000-8000-%';

-- Audit entries the demo rows generated, if any were made through the UI.
delete from public.audit_logs
 where entity_id::text like any (array[
   'd15d0001-0000-4000-8000-%',
   'c0ff0000-0000-4000-8000-%',
   'e0e00000-0000-4000-8000-%',
   'beef0000-0000-4000-8000-%'
 ]);

-- The eight demo accounts. Deleting from auth.users cascades to profiles,
-- profile_contacts, member_applications, posts, likes and notifications.
delete from auth.users where id::text like 'd0d0d0d0-0000-4000-8000-%';

commit;

do $$
begin
  raise notice 'Demo data removed.';
end;
$$;
