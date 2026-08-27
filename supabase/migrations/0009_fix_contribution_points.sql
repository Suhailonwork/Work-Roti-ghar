-- ============================================================================
-- Roti Ghar — take contribution points back when the contribution is deleted
--
-- THE BUG
--
-- `sync_contribution_points()` (0002) is attached as:
--
--     after insert or update of verification_status, contributor_id
--
-- There is no DELETE. So deleting a verified contribution removed the money
-- from the balance but left the `point_transactions` row it had created — a
-- ledger entry pointing at a `reference_id` that no longer exists. The member
-- kept those points permanently, and the leaderboard counted them.
--
-- Distributions never had this problem: 0002 gives them
-- `distributions_revoke_points`, an AFTER DELETE trigger. This migration adds
-- the matching one for contributions, and clears any strays already left
-- behind by deletions that happened before it existed.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- ------------------------------------------------------------- the trigger --
-- SECURITY DEFINER for the same reason as its distribution counterpart:
-- `point_transactions` is admin-write under RLS, and the ledger has to stay
-- consistent regardless of who deleted the record.
create or replace function public.revoke_contribution_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.point_transactions
   where reference_type = 'contribution'
     and reference_id = old.id;
  return null;
end;
$$;

drop trigger if exists contributions_revoke_points on public.contributions;
create trigger contributions_revoke_points
  after delete on public.contributions
  for each row execute function public.revoke_contribution_points();

-- --------------------------------------------------------------- backfill --
-- Points left over from contributions deleted before the trigger existed.
-- Removing them fires `point_transactions_sync`, which recomputes
-- `profiles.points` for each affected member — so totals and the leaderboard
-- correct themselves without a second pass.
do $$
declare
  v_removed integer;
begin
  with orphaned as (
    delete from public.point_transactions pt
     where pt.reference_type = 'contribution'
       and pt.reference_id is not null
       and not exists (
         select 1 from public.contributions c where c.id = pt.reference_id
       )
    returning 1
  )
  select count(*) into v_removed from orphaned;

  if v_removed > 0 then
    raise notice 'Removed % orphaned contribution point entries.', v_removed;
  else
    raise notice 'No orphaned contribution points found.';
  end if;
end;
$$;
