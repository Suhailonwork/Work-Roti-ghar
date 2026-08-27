-- ============================================================================
-- Roti Ghar — DEMO DATA (optional)
--
-- Fills the member dashboard and the admin screens with realistic-looking
-- records so every section has something to show: members with photos, a
-- contribution ledger, expenses, families and dated distributions.
--
-- READ THIS BEFORE RUNNING
--
--  * This is sample data, not real records. Do not leave it in a database
--    that holds genuine contributions or genuine families.
--  * Everything it creates uses ids beginning `d0d0…`, `beef…`, `c0ff…`,
--    `e0e0…` and `d15d…`, so it can all be removed in one go — run
--    `supabase/demo_data_teardown.sql`.
--  * The eight demo accounts CANNOT sign in. They have no `auth.identities`
--    row and a deliberately invalid password hash, so they exist only as
--    names and faces in the directory.
--  * Safe to re-run: every insert is keyed on a fixed id and does nothing on
--    conflict.
--
-- Depends on 0005 (site settings + the standard ration kit) having run.
-- ============================================================================

-- ---------------------------------------------------------------- accounts --
-- Inserting into auth.users fires handle_new_user(), which creates the profile,
-- the private contact row and a membership application for each one.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  person.id,
  'authenticated',
  'authenticated',
  person.email,
  '!demo-account-cannot-sign-in',           -- not a valid bcrypt hash, by design
  now(),
  now() - (person.age_days || ' days')::interval,
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', person.full_name),
  '', '', '', ''
from (values
  ('d0d0d0d0-0000-4000-8000-000000000001'::uuid, 'imran.demo@rotighar.invalid',  'Imran Qureshi',  420),
  ('d0d0d0d0-0000-4000-8000-000000000002'::uuid, 'ayesha.demo@rotighar.invalid', 'Ayesha Shaikh',  390),
  ('d0d0d0d0-0000-4000-8000-000000000003'::uuid, 'farhan.demo@rotighar.invalid', 'Farhan Ansari',  360),
  ('d0d0d0d0-0000-4000-8000-000000000004'::uuid, 'zainab.demo@rotighar.invalid', 'Zainab Patel',   300),
  ('d0d0d0d0-0000-4000-8000-000000000005'::uuid, 'rehan.demo@rotighar.invalid',  'Rehan Sayyed',   240),
  ('d0d0d0d0-0000-4000-8000-000000000006'::uuid, 'nusrat.demo@rotighar.invalid', 'Nusrat Khan',    180),
  ('d0d0d0d0-0000-4000-8000-000000000007'::uuid, 'adil.demo@rotighar.invalid',   'Adil Momin',     120),
  ('d0d0d0d0-0000-4000-8000-000000000008'::uuid, 'sana.demo@rotighar.invalid',   'Sana Merchant',   60)
) as person(id, email, full_name, age_days)
on conflict (id) do nothing;

-- Approve them and give them roles and photos. handle_new_user() leaves every
-- new account `pending`, which is correct for a real signup but would leave the
-- demo directory empty.
update public.profiles p
   set role        = v.role::user_role,
       status      = 'active',
       avatar_url  = v.avatar,
       bio         = v.bio,
       joined_at   = now() - (v.age_days || ' days')::interval,
       approved_at = now() - (v.age_days || ' days')::interval
  from (values
    ('d0d0d0d0-0000-4000-8000-000000000001'::uuid, 'volunteer', '/images/avatars/imran.svg',  'Runs the Saturday packing shift.',            420),
    ('d0d0d0d0-0000-4000-8000-000000000002'::uuid, 'volunteer', '/images/avatars/ayesha.svg', 'Coordinates referrals in Nagpada.',           390),
    ('d0d0d0d0-0000-4000-8000-000000000003'::uuid, 'volunteer', '/images/avatars/farhan.svg', 'Drives the delivery run most months.',        360),
    ('d0d0d0d0-0000-4000-8000-000000000004'::uuid, 'member',    '/images/avatars/zainab.svg', 'Joined after a packing day in Byculla.',      300),
    ('d0d0d0d0-0000-4000-8000-000000000005'::uuid, 'member',    '/images/avatars/rehan.svg',  null,                                          240),
    ('d0d0d0d0-0000-4000-8000-000000000006'::uuid, 'member',    '/images/avatars/nusrat.svg', 'Helps with storage space above the shop.',    180),
    ('d0d0d0d0-0000-4000-8000-000000000007'::uuid, 'member',    '/images/avatars/adil.svg',   null,                                          120),
    ('d0d0d0d0-0000-4000-8000-000000000008'::uuid, 'member',    '/images/avatars/sana.svg',   'Newest member of the round.',                  60)
  ) as v(id, role, avatar, bio, age_days)
 where p.id = v.id;

-- Their auto-created applications would otherwise sit in the admin queue.
update public.member_applications
   set status = 'approved',
       reviewed_at = now(),
       review_notes = 'Demo record.'
 where profile_id in (
   select id from public.profiles
    where id::text like 'd0d0d0d0-0000-4000-8000-%'
 )
   and status = 'pending';

-- --------------------------------------------------------------- ration kit --
-- A second, smaller kit so the ration screen shows more than one option.
insert into public.ration_kits (id, name, description, estimated_cost, is_active)
values (
  'd15d0000-0000-4000-8000-000000000001',
  'Compact Kit',
  'A lighter kit for smaller households, or as a top-up between monthly rounds.',
  0, true
)
on conflict (id) do nothing;

insert into public.ration_kit_items (kit_id, item_name, quantity, unit, position) values
  ('d15d0000-0000-4000-8000-000000000001', 'Rice',  5, 'KG', 0),
  ('d15d0000-0000-4000-8000-000000000001', 'Flour', 5, 'KG', 1),
  ('d15d0000-0000-4000-8000-000000000001', 'Dal',   1, 'KG', 2),
  ('d15d0000-0000-4000-8000-000000000001', 'Oil',   1, 'L',  3),
  ('d15d0000-0000-4000-8000-000000000001', 'Salt',  1, 'KG', 4)
on conflict do nothing;

-- ------------------------------------------------------------ beneficiaries --
-- Invented families. Phone and address are left null on purpose: members can
-- read this table now, and there is no reason for sample data to model the two
-- columns the application deliberately never shows them.
insert into public.beneficiaries (id, name, area, family_size, status, notes) values
  ('beef0000-0000-4000-8000-000000000001', 'Salma Bano',      'Nagpada',   5, 'active', 'Referred by Ayesha.'),
  ('beef0000-0000-4000-8000-000000000002', 'Rafiq Ahmed',     'Byculla',   3, 'active', null),
  ('beef0000-0000-4000-8000-000000000003', 'Fatima Sheikh',   'Dongri',    7, 'active', 'Two school-age children.'),
  ('beef0000-0000-4000-8000-000000000004', 'Iqbal Shaikh',    'Madanpura', 4, 'active', null),
  ('beef0000-0000-4000-8000-000000000005', 'Razia Begum',     'Nagpada',   2, 'active', 'Elderly, lives with her sister.'),
  ('beef0000-0000-4000-8000-000000000006', 'Yusuf Khan',      'Agripada',  6, 'active', null),
  ('beef0000-0000-4000-8000-000000000007', 'Shabana Ansari',  'Byculla',   4, 'active', 'Referred by a neighbour.'),
  ('beef0000-0000-4000-8000-000000000008', 'Mohsin Dalvi',    'Dongri',    3, 'active', null),
  ('beef0000-0000-4000-8000-000000000009', 'Nasreen Sayyed',  'Madanpura', 5, 'active', null),
  ('beef0000-0000-4000-8000-00000000000a', 'Hamid Qureshi',   'Agripada',  8, 'active', 'Large household, receives two kits.')
on conflict (id) do nothing;

-- ------------------------------------------------------------ distributions --
-- Deliveries happen on a handful of days, not every day. The dates below are
-- clustered on six rounds over roughly four months, with the two most recent
-- inside the last month so the dashboard's default range is not empty.
--
-- Inserting these fires award_distribution_points(), which credits the
-- volunteer named in `distributed_by` — that is what fills the leaderboard.
insert into public.distributions (id, beneficiary_id, kit_id, quantity, distributed_on, distributed_by, notes)
select
  d.id,
  d.beneficiary_id,
  d.kit_id,
  d.quantity,
  (current_date - d.days_ago)::date,
  d.volunteer,
  d.notes
from (values
  -- round 1 — most recent (within the last week)
  ('d15d0001-0000-4000-8000-000000000001'::uuid, 'beef0000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1,  4, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000002'::uuid, 'beef0000-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1,  4, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000003'::uuid, 'beef0000-0000-4000-8000-00000000000a'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 2,  4, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, 'Large household.'),
  ('d15d0001-0000-4000-8000-000000000004'::uuid, 'beef0000-0000-4000-8000-000000000005'::uuid, 'd15d0000-0000-4000-8000-000000000001'::uuid, 1,  4, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),

  -- round 2 — a fortnight earlier
  ('d15d0001-0000-4000-8000-000000000005'::uuid, 'beef0000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 18, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000006'::uuid, 'beef0000-0000-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 18, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000007'::uuid, 'beef0000-0000-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 18, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000008'::uuid, 'beef0000-0000-4000-8000-000000000008'::uuid, 'd15d0000-0000-4000-8000-000000000001'::uuid, 1, 18, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, 'Top-up between rounds.'),

  -- round 3 — previous month
  ('d15d0001-0000-4000-8000-000000000009'::uuid, 'beef0000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 41, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),
  ('d15d0001-0000-4000-8000-00000000000a'::uuid, 'beef0000-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 41, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),
  ('d15d0001-0000-4000-8000-00000000000b'::uuid, 'beef0000-0000-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 41, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-00000000000c'::uuid, 'beef0000-0000-4000-8000-000000000009'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 41, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-00000000000d'::uuid, 'beef0000-0000-4000-8000-00000000000a'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 2, 41, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),

  -- round 4
  ('d15d0001-0000-4000-8000-00000000000e'::uuid, 'beef0000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 63, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-00000000000f'::uuid, 'beef0000-0000-4000-8000-000000000005'::uuid, 'd15d0000-0000-4000-8000-000000000001'::uuid, 1, 63, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000010'::uuid, 'beef0000-0000-4000-8000-000000000006'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 63, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000011'::uuid, 'beef0000-0000-4000-8000-000000000008'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 63, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),

  -- round 5
  ('d15d0001-0000-4000-8000-000000000012'::uuid, 'beef0000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 88, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000013'::uuid, 'beef0000-0000-4000-8000-000000000004'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 88, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000014'::uuid, 'beef0000-0000-4000-8000-000000000007'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 88, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000015'::uuid, 'beef0000-0000-4000-8000-00000000000a'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 2, 88, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, null),

  -- round 6 — oldest
  ('d15d0001-0000-4000-8000-000000000016'::uuid, 'beef0000-0000-4000-8000-000000000003'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 112, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000017'::uuid, 'beef0000-0000-4000-8000-000000000009'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 1, 112, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, null),
  ('d15d0001-0000-4000-8000-000000000018'::uuid, 'beef0000-0000-4000-8000-000000000006'::uuid, 'd15d0000-0000-4000-8000-000000000001'::uuid, 1, 112, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, null)
) as d(id, beneficiary_id, kit_id, quantity, days_ago, volunteer, notes)
on conflict (id) do nothing;

-- ------------------------------------------------------------ contributions --
-- Recorded as `verified`, which is what an administrator entering a
-- contribution now produces — so these count towards the balance immediately
-- and credit contribution points to the linked member.
insert into public.contributions (
  id, contributor_id, contributor_name, amount, contributed_on,
  payment_method, purpose, verification_status, verified_at, source
)
select
  c.id,
  c.contributor_id,
  c.contributor_name,
  c.amount,
  (current_date - c.days_ago)::date,
  c.method,
  c.purpose,
  'verified',
  now() - (c.days_ago || ' days')::interval,
  'internal'
from (values
  ('c0ff0000-0000-4000-8000-000000000001'::uuid, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, 'Imran Qureshi', 25000.00, 6, 'upi', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-000000000002'::uuid, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, 'Ayesha Shaikh', 18000.00, 8, 'bank transfer', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-000000000003'::uuid, 'd0d0d0d0-0000-4000-8000-000000000004'::uuid, 'Zainab Patel', 9000.00, 11, 'upi', null),
  ('c0ff0000-0000-4000-8000-000000000004'::uuid, 'd0d0d0d0-0000-4000-8000-000000000006'::uuid, 'Nusrat Khan', 6000.00, 14, 'cash', null),
  ('c0ff0000-0000-4000-8000-000000000005'::uuid, 'd0d0d0d0-0000-4000-8000-000000000008'::uuid, 'Sana Merchant', 7000.00, 19, 'upi', 'First contribution'),
  ('c0ff0000-0000-4000-8000-000000000006'::uuid, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, 'Farhan Ansari', 14000.00, 22, 'bank transfer', null),
  ('c0ff0000-0000-4000-8000-000000000007'::uuid, null, 'Anonymous well-wisher', 12000.00, 26, 'cash', 'Given at the store room'),
  ('c0ff0000-0000-4000-8000-000000000008'::uuid, 'd0d0d0d0-0000-4000-8000-000000000005'::uuid, 'Rehan Sayyed', 8500.00, 31, 'upi', null),
  ('c0ff0000-0000-4000-8000-000000000009'::uuid, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, 'Imran Qureshi', 25000.00, 36, 'upi', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-00000000000a'::uuid, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, 'Ayesha Shaikh', 18000.00, 38, 'bank transfer', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-00000000000b'::uuid, 'd0d0d0d0-0000-4000-8000-000000000007'::uuid, 'Adil Momin', 7500.00, 44, 'cash', null),
  ('c0ff0000-0000-4000-8000-00000000000c'::uuid, 'd0d0d0d0-0000-4000-8000-000000000004'::uuid, 'Zainab Patel', 9000.00, 49, 'upi', null),
  ('c0ff0000-0000-4000-8000-00000000000d'::uuid, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, 'Farhan Ansari', 14000.00, 55, 'bank transfer', null),
  ('c0ff0000-0000-4000-8000-00000000000e'::uuid, null, 'Local shopkeeper', 9000.00, 61, 'in kind', 'Two sacks of rice, valued'),
  ('c0ff0000-0000-4000-8000-00000000000f'::uuid, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, 'Imran Qureshi', 25000.00, 67, 'upi', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-000000000010'::uuid, 'd0d0d0d0-0000-4000-8000-000000000006'::uuid, 'Nusrat Khan', 6000.00, 73, 'cash', null),
  ('c0ff0000-0000-4000-8000-000000000011'::uuid, 'd0d0d0d0-0000-4000-8000-000000000002'::uuid, 'Ayesha Shaikh', 18000.00, 79, 'bank transfer', 'Monthly round'),
  ('c0ff0000-0000-4000-8000-000000000012'::uuid, 'd0d0d0d0-0000-4000-8000-000000000005'::uuid, 'Rehan Sayyed', 8500.00, 86, 'upi', null),
  ('c0ff0000-0000-4000-8000-000000000013'::uuid, 'd0d0d0d0-0000-4000-8000-000000000003'::uuid, 'Farhan Ansari', 14000.00, 94, 'bank transfer', null),
  ('c0ff0000-0000-4000-8000-000000000014'::uuid, 'd0d0d0d0-0000-4000-8000-000000000001'::uuid, 'Imran Qureshi', 25000.00, 101, 'upi', 'Monthly round')
) as c(id, contributor_id, contributor_name, amount, days_ago, method, purpose)
on conflict (id) do nothing;

-- ----------------------------------------------------------------- expenses --
insert into public.expenses (
  id, category, amount, spent_on, description, vendor, verification_status, verified_at
)
select
  e.id,
  e.category::expense_category,
  e.amount,
  (current_date - e.days_ago)::date,
  e.description,
  e.vendor,
  'verified',
  now() - (e.days_ago || ' days')::interval
from (values
  ('e0e00000-0000-4000-8000-000000000001'::uuid, 'ration',    42000.00,   5, 'Rice, flour and dal for the monthly round', 'Bismillah Wholesale'),
  ('e0e00000-0000-4000-8000-000000000002'::uuid, 'packaging', 3200.00,    5, 'Sacks and tape',                            'Crescent Packaging'),
  ('e0e00000-0000-4000-8000-000000000003'::uuid, 'transport', 4500.00,    4, 'Tempo hire for the delivery run',           null),
  ('e0e00000-0000-4000-8000-000000000004'::uuid, 'ration',    18000.00,  19, 'Oil, sugar, salt and tea',                  'Bismillah Wholesale'),
  ('e0e00000-0000-4000-8000-000000000005'::uuid, 'transport', 3800.00,   18, 'Tempo hire',                                null),
  ('e0e00000-0000-4000-8000-000000000006'::uuid, 'storage',   6000.00,   30, 'Store room rent',                           null),
  ('e0e00000-0000-4000-8000-000000000007'::uuid, 'ration',    41000.00,  42, 'Monthly kit stock',                         'Bismillah Wholesale'),
  ('e0e00000-0000-4000-8000-000000000008'::uuid, 'transport', 4200.00,   41, 'Tempo hire',                                null),
  ('e0e00000-0000-4000-8000-000000000009'::uuid, 'utilities', 1400.00,   45, 'Electricity for the store room',            null),
  ('e0e00000-0000-4000-8000-00000000000a'::uuid, 'storage',   6000.00,   60, 'Store room rent',                           null),
  ('e0e00000-0000-4000-8000-00000000000b'::uuid, 'ration',    39500.00,  64, 'Monthly kit stock',                         'Bismillah Wholesale'),
  ('e0e00000-0000-4000-8000-00000000000c'::uuid, 'packaging', 2800.00,   64, 'Sacks and labels',                          'Crescent Packaging'),
  ('e0e00000-0000-4000-8000-00000000000d'::uuid, 'transport', 4000.00,   63, 'Tempo hire',                                null),
  ('e0e00000-0000-4000-8000-00000000000e'::uuid, 'storage',   6000.00,   90, 'Store room rent',                           null),
  ('e0e00000-0000-4000-8000-00000000000f'::uuid, 'ration',    38000.00,  95, 'Monthly kit stock',                         'Bismillah Wholesale'),
  ('e0e00000-0000-4000-8000-000000000010'::uuid, 'other',     2200.00,  100, 'Printing of delivery record sheets',        null)
) as e(id, category, amount, days_ago, description, vendor)
on conflict (id) do nothing;

-- ----------------------------------------------------------- member of month --
-- Last calendar month, so the dashboard's honours card has something in it.
insert into public.member_of_month (id, profile_id, year, month, citation)
select
  'd0d0beef-0000-4000-8000-000000000001',
  'd0d0d0d0-0000-4000-8000-000000000003',
  extract(year  from (date_trunc('month', current_date) - interval '1 month'))::int,
  extract(month from (date_trunc('month', current_date) - interval '1 month'))::int,
  'Drove every delivery run last month, including the two long ones out to Agripada.'
on conflict (year, month) do nothing;

-- ------------------------------------------------------------------ summary --
do $$
declare
  v_received numeric;
  v_spent    numeric;
begin
  select coalesce(sum(amount), 0) into v_received
    from public.contributions where verification_status = 'verified';
  select coalesce(sum(amount), 0) into v_spent
    from public.expenses where verification_status = 'verified';

  raise notice 'Demo data loaded. Verified contributions: %, expenses: %, balance: %.',
    v_received, v_spent, v_received - v_spent;
  raise notice 'Remove it all with supabase/demo_data_teardown.sql.';
end;
$$;
