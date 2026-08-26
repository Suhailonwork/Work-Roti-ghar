-- ============================================================================
-- Roti Ghar — seed content
--
-- Creates the site settings, the CMS-driven homepage (every section is a block
-- an admin can reorder or delete), a starter ration kit, and supporting pages.
-- Safe to re-run: everything is upserted by a stable key.
-- ============================================================================

-- ------------------------------------------------------------- site settings
insert into public.site_settings (key, value, description, is_public) values
  ('org', jsonb_build_object(
      'name', 'Roti Ghar',
      'tagline', 'No neighbour left hungry.',
      'email', 'contact@workrotighar.com',
      'phone', '',
      'address', '',
      'socials', jsonb_build_object('instagram','', 'facebook','', 'whatsapp','', 'youtube','')
   ), 'Organisation identity shown across the public site and footer.', true),

  ('support', jsonb_build_object(
      'public_payments_enabled', false,
      'policy_statement', 'We do not take donations from the public. We operate through our volunteers and members.',
      'methods', '[]'::jsonb,
      'note', 'Public payment collection is disabled. Enable it only if it matches the organisation''s actual policy, and only with a legitimate payment gateway.'
   ), 'Support / Sadaqah configuration. Public payments are OFF by default.', true),

  ('seo_defaults', jsonb_build_object(
      'site_name', 'Roti Ghar',
      'title', 'Roti Ghar — Community Kitchen & Ration Support',
      'description', 'Roti Ghar is a volunteer-run community initiative delivering monthly ration kits to families in need. We do not take donations from the public — we operate through our volunteers and members.',
      'og_image', '/images/og-default.svg',
      'twitter_site', ''
   ), 'Fallback metadata for pages that do not define their own SEO.', true),

  ('points_rules', jsonb_build_object(
      'distribution', 10,
      'verified_contribution', 5,
      'post', 1,
      'volunteer_day', 15
   ), 'Default point values awarded for verified activity.', false)
on conflict (key) do nothing;

-- --------------------------------------------------------------- ration kit
insert into public.ration_kits (id, name, description, estimated_cost, is_active)
values (
  '11111111-1111-4111-8111-111111111111',
  'Standard Monthly Ration Kit',
  'The staple kit distributed to a family of five for approximately one month.',
  0, true
)
on conflict (id) do nothing;

insert into public.ration_kit_items (kit_id, item_name, quantity, unit, position) values
  ('11111111-1111-4111-8111-111111111111', 'Rice',  10, 'KG', 0),
  ('11111111-1111-4111-8111-111111111111', 'Flour', 10, 'KG', 1),
  ('11111111-1111-4111-8111-111111111111', 'Dal',    2, 'KG', 2),
  ('11111111-1111-4111-8111-111111111111', 'Oil',    2, 'L',  3),
  ('11111111-1111-4111-8111-111111111111', 'Sugar',  2, 'KG', 4),
  ('11111111-1111-4111-8111-111111111111', 'Salt',   1, 'KG', 5),
  ('11111111-1111-4111-8111-111111111111', 'Tea',  250, 'G',  6)
on conflict do nothing;

-- ------------------------------------------------------------------ homepage
insert into public.cms_pages (id, slug, title, status, is_home, published_at)
values (
  '22222222-2222-4222-8222-222222222222',
  'home', 'Roti Ghar', 'published', true, now()
)
on conflict (id) do nothing;

insert into public.cms_seo (
  page_id, seo_title, meta_description, canonical_url,
  og_title, og_description, og_image_url, og_image_alt,
  twitter_card, twitter_title, twitter_description, no_index, keywords
) values (
  '22222222-2222-4222-8222-222222222222',
  'Roti Ghar — Community Kitchen & Ration Support',
  'Roti Ghar is a volunteer-run community initiative delivering monthly ration kits to families in need. We do not take donations from the public — we operate through our volunteers and members.',
  'https://workrotighar.com',
  'Roti Ghar — No neighbour left hungry',
  'A volunteer-run community delivering monthly ration kits to families in need.',
  '/images/og-default.svg',
  'Roti Ghar — community ration support',
  'summary_large_image',
  'Roti Ghar — No neighbour left hungry',
  'A volunteer-run community delivering monthly ration kits to families in need.',
  false,
  array['roti ghar','ration kit','community kitchen','volunteer','food support','sadaqah']
)
on conflict (page_id) do nothing;

insert into public.cms_page_blocks (page_id, block_type, position, data) values
-- 0 — Hero
('22222222-2222-4222-8222-222222222222', 'hero', 0, jsonb_build_object(
  'eyebrow', 'Roti Ghar',
  'title', 'No neighbour should sleep hungry.',
  'subtitle', 'We are a volunteer-run community that packs and delivers monthly ration kits to families who need them — quietly, consistently, and with dignity.',
  'image_url', '/images/hero-kitchen.svg',
  'image_alt', 'Volunteers packing ration kits at Roti Ghar',
  'align', 'left',
  'primary_cta', jsonb_build_object('label', 'Become a volunteer', 'href', '/signup'),
  'secondary_cta', jsonb_build_object('label', 'How we work', 'href', '#how-we-work')
)),

-- 1 — Hadith / Ayah
('22222222-2222-4222-8222-222222222222', 'hadith', 1, jsonb_build_object(
  'arabic', 'وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا',
  'text', 'And they give food, in spite of their own love for it, to the needy, the orphan and the captive.',
  'reference', 'Surah Al-Insan 76:8',
  'translation', ''
)),

-- 2 — Mission
('22222222-2222-4222-8222-222222222222', 'image_text', 2, jsonb_build_object(
  'title', 'Our mission',
  'body', 'Roti Ghar exists so that no family in our neighbourhood has to choose between rent and a meal.

We identify households quietly through people who already know them — teachers, imams, shopkeepers, neighbours. We verify need without interrogation, and we deliver without ceremony. Every kit is logged, every rupee is accounted for, and every family is treated as a guest rather than a case number.',
  'image_url', '/images/mission-kit.svg',
  'image_alt', 'A packed Roti Ghar ration kit',
  'image_side', 'right'
)),

-- 3 — Funding policy statement
('22222222-2222-4222-8222-222222222222', 'rich_text', 3, jsonb_build_object(
  'variant', 'notice',
  'title', 'We do not take donations from the public',
  'body', 'Roti Ghar operates entirely through its volunteers and members. We do not run public fundraising campaigns and we do not collect money from the general public.

If you would like to help, join us as a volunteer or member — your time, your hands and your local knowledge are what this work actually runs on.',
  'align', 'center'
)),

-- 4 — How we work
('22222222-2222-4222-8222-222222222222', 'cards', 4, jsonb_build_object(
  'id', 'how-we-work',
  'title', 'How we work',
  'subtitle', 'Four steps, repeated every month, by the same people.',
  'columns', 4,
  'items', jsonb_build_array(
    jsonb_build_object('icon','search','title','1. Identify','body','Members refer families they personally know. A volunteer visits, confirms the need and records the household size.'),
    jsonb_build_object('icon','package','title','2. Pack','body','Volunteers assemble standard kits — rice, flour, dal, oil, sugar, salt and tea — enough to carry a family through the month.'),
    jsonb_build_object('icon','truck','title','3. Deliver','body','Kits are delivered to the door at a time the family chooses. No queues, no photographs of faces, no conditions.'),
    jsonb_build_object('icon','clipboard-check','title','4. Record','body','Every distribution is logged against the family and the kit, so the next month starts from facts rather than memory.')
  )
)),

-- 5 — Impact statistics (live figures from the distribution records)
('22222222-2222-4222-8222-222222222222', 'statistics', 5, jsonb_build_object(
  'title', 'Where things stand',
  'subtitle', 'Figures come straight from our distribution records — they update themselves.',
  'source', 'live',
  'items', jsonb_build_array(
    jsonb_build_object('key','families_helped','label','Families supported'),
    jsonb_build_object('key','kits_distributed','label','Ration kits delivered'),
    jsonb_build_object('key','volunteers','label','Active volunteers'),
    jsonb_build_object('key','areas_served','label','Areas served')
  )
)),

-- 6 — Gallery
('22222222-2222-4222-8222-222222222222', 'gallery', 6, jsonb_build_object(
  'title', 'From the ground',
  'subtitle', 'Packing days, delivery runs and the people who show up.',
  'layout', 'grid',
  'items', jsonb_build_array(
    jsonb_build_object('url','/images/gallery-1.svg','alt','Volunteers weighing rice into sacks','caption','Packing day'),
    jsonb_build_object('url','/images/gallery-2.svg','alt','Kits stacked and ready for delivery','caption','Ready to go'),
    jsonb_build_object('url','/images/gallery-3.svg','alt','A volunteer loading kits into a van','caption','Delivery run'),
    jsonb_build_object('url','/images/gallery-4.svg','alt','Members gathered after a distribution','caption','After the round')
  )
)),

-- 7 — Volunteer CTA
('22222222-2222-4222-8222-222222222222', 'cta', 7, jsonb_build_object(
  'variant', 'primary',
  'title', 'Give a morning, not money.',
  'body', 'Volunteers pack on weekends and deliver on weekday evenings. If you can spare a few hours a month, that is genuinely all we need.',
  'primary_cta', jsonb_build_object('label','Apply to volunteer','href','/signup'),
  'secondary_cta', jsonb_build_object('label','Already a member? Sign in','href','/login')
)),

-- 8 — Support CTA
('22222222-2222-4222-8222-222222222222', 'cta', 8, jsonb_build_object(
  'variant', 'soft',
  'title', 'Other ways to support',
  'body', 'We accept help in kind — a sack of rice, transport for a delivery run, storage space, or an introduction to a family who needs us. Tell us what you can offer.',
  'primary_cta', jsonb_build_object('label','Offer support','href','/support')
))
on conflict do nothing;

-- ------------------------------------------------------------- support page
insert into public.cms_pages (id, slug, title, status, is_home, published_at)
values (
  '33333333-3333-4333-8333-333333333333',
  'about', 'About Roti Ghar', 'published', false, now()
)
on conflict (id) do nothing;

insert into public.cms_seo (page_id, seo_title, meta_description, canonical_url, og_title, og_description, no_index)
values (
  '33333333-3333-4333-8333-333333333333',
  'About Roti Ghar',
  'Who runs Roti Ghar, how we choose the families we serve, and why we do not take public donations.',
  'https://workrotighar.com/about',
  'About Roti Ghar',
  'Who runs Roti Ghar, how we choose the families we serve, and why we do not take public donations.',
  false
)
on conflict (page_id) do nothing;

insert into public.cms_page_blocks (page_id, block_type, position, data) values
('33333333-3333-4333-8333-333333333333', 'hero', 0, jsonb_build_object(
  'eyebrow', 'About',
  'title', 'A kitchen, a store room, and people who keep showing up.',
  'subtitle', 'Roti Ghar started with one family and a monthly sack of rice. The method has not changed much since.',
  'align', 'center'
)),
('33333333-3333-4333-8333-333333333333', 'rich_text', 1, jsonb_build_object(
  'variant', 'default',
  'title', 'How we choose families',
  'body', 'We do not advertise for applicants. Families reach us through members who already know them, which keeps referrals honest and keeps families from having to prove their hardship to strangers.

A volunteer visits, records household size and circumstances, and the family is added to the monthly round. Records are kept private — only administrators and the volunteers running a delivery can see a family''s details.',
  'align', 'left'
)),
('33333333-3333-4333-8333-333333333333', 'rich_text', 2, jsonb_build_object(
  'variant', 'notice',
  'title', 'On money',
  'body', 'We do not take donations from the public. Our costs are covered by our own members, and every contribution and expense is recorded and verified internally before it appears in our accounts.',
  'align', 'left'
)),
('33333333-3333-4333-8333-333333333333', 'cta', 3, jsonb_build_object(
  'variant', 'primary',
  'title', 'Join the round',
  'body', 'Membership applications are reviewed by an administrator. Tell us who referred you and we will be in touch.',
  'primary_cta', jsonb_build_object('label','Apply to join','href','/signup')
))
on conflict do nothing;
