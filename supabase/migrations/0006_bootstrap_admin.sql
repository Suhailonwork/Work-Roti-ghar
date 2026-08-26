-- ============================================================================
-- Roti Ghar — bootstrap the first administrator
--
-- Signup always creates a `pending` member, and only an admin can approve
-- anyone — which leaves a chicken-and-egg problem on a fresh database. Run this
-- ONCE, after the first person has signed up through /signup, to promote them.
--
-- Replace the email below with the real one, then run it in the Supabase SQL
-- editor. It is safe to re-run: promoting an existing admin changes nothing.
-- ============================================================================

do $$
declare
  v_email text := 'Suhail.work71@gmail.com';   -- <<< EDIT THIS
  v_id    uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);

  if v_id is null then
    raise exception
      'No account found for %. Sign up at /signup first, then run this again.', v_email;
  end if;

  update public.profiles
     set role        = 'admin',
         status      = 'active',
         joined_at   = coalesce(joined_at, now()),
         approved_at = coalesce(approved_at, now())
   where id = v_id;

  update public.member_applications
     set status      = 'approved',
         reviewed_at = coalesce(reviewed_at, now()),
         review_notes = coalesce(review_notes, 'Bootstrapped as the first administrator.')
   where profile_id = v_id and status = 'pending';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary)
  values (v_id, 'member.role_changed', 'profile', v_id,
          format('Bootstrapped %s as the first administrator', v_email));

  raise notice 'Promoted % to administrator.', v_email;
end;
$$;
