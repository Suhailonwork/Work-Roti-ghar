-- ============================================================================
-- Roti Ghar — on-page SEO for the "Workrotighar" brand
--
-- Target keyword:  workrotighar
-- Supporting:      rotighar, roti ghar, work
--
-- Rewrites the site-wide SEO defaults and the homepage meta/Open Graph tags
-- around those terms, points the OG image at the generated PNG (/og-image —
-- social scrapers reject SVG), and adds the long-form homepage copy search
-- engines need in order to rank the brand.
--
-- Safe to re-run: settings and SEO rows are updated in place, and the content
-- blocks are keyed by `seo_key` so they are replaced rather than duplicated.
-- ============================================================================

do $$
declare
  v_home  uuid;
  v_about uuid;
  v_pos   integer;
begin
  select id into v_home from public.cms_pages where is_home order by updated_at desc limit 1;
  if v_home is null then
    select id into v_home from public.cms_pages where slug = 'home' limit 1;
  end if;

  if v_home is null then
    raise exception 'No homepage found. Run 0005_seed.sql before this migration.';
  end if;

  -- ------------------------------------------------------- site-wide defaults
  update public.site_settings
     set value = value
       || jsonb_build_object(
            'site_name', 'Roti Ghar',
            'title', 'Workrotighar — Roti Ghar Community Kitchen & Ration Support',
            'description', 'Workrotighar is the official website of Roti Ghar — a volunteer-run community kitchen delivering monthly ration kits to families in need. Join the work as a volunteer or member.',
            'og_image', '/og-image'
          )
   where key = 'seo_defaults';

  -- ------------------------------------------------------------ homepage SEO
  insert into public.cms_seo (page_id) values (v_home)
  on conflict (page_id) do nothing;

  update public.cms_seo
     set seo_title           = 'Workrotighar — Roti Ghar Community Kitchen & Ration Support',
         meta_description    = 'Workrotighar is the official website of Roti Ghar, a volunteer-run community kitchen delivering monthly ration kits to families in need. See the work and join as a volunteer.',
         canonical_url       = 'https://workrotighar.com',
         og_title            = 'Workrotighar — Roti Ghar | No neighbour left hungry',
         og_description      = 'Roti Ghar is a volunteer-run community kitchen. Every month we pack and deliver ration kits to families in need — no public donations, just the work of our members.',
         og_image_url        = '/og-image',
         og_image_alt        = 'Workrotighar — Roti Ghar community kitchen and ration support',
         twitter_card        = 'summary_large_image',
         twitter_title       = 'Workrotighar — Roti Ghar | No neighbour left hungry',
         twitter_description = 'A volunteer-run community kitchen delivering monthly ration kits to families in need. See the work at workrotighar.com.',
         twitter_image_url   = '/og-image',
         no_index            = false,
         keywords            = array[
           'workrotighar', 'work roti ghar', 'rotighar', 'roti ghar', 'roti ghar work',
           'rotighar work', 'community kitchen', 'ration kit', 'monthly ration kit',
           'volunteer work', 'food support', 'NGO', 'sadaqah'
         ],
         updated_at          = now()
   where page_id = v_home;

  -- ------------------------------------------------------------- about page
  select id into v_about from public.cms_pages where slug = 'about' limit 1;

  if v_about is not null then
    insert into public.cms_seo (page_id) values (v_about)
    on conflict (page_id) do nothing;

    update public.cms_seo
       set seo_title        = 'About Roti Ghar — the people behind Workrotighar',
           meta_description = 'Who runs Roti Ghar, how we choose the families we serve, and why the work is funded by our own members instead of public donations.',
           canonical_url    = 'https://workrotighar.com/about',
           og_title         = 'About Roti Ghar — the people behind Workrotighar',
           og_description   = 'Who runs Roti Ghar, how we choose the families we serve, and why the work is funded by our own members instead of public donations.',
           og_image_url     = coalesce(nullif(og_image_url, ''), '/og-image'),
           og_image_alt     = 'About Roti Ghar',
           keywords         = array['about roti ghar', 'rotighar', 'workrotighar', 'roti ghar work'],
           updated_at       = now()
     where page_id = v_about;
  end if;

  -- ------------------------------------------------ homepage H1 / hero copy
  -- The <h1> carries the brand, and the eyebrow above it carries the exact
  -- search term. Both are still editable from the admin CMS afterwards.
  update public.cms_page_blocks
     set data = data || jsonb_build_object(
           'eyebrow', 'Workrotighar · Roti Ghar',
           'title', 'Roti Ghar — no neighbour should sleep hungry.',
           'image_alt', 'Roti Ghar volunteers packing monthly ration kits'
         ),
         updated_at = now()
   where page_id = v_home
     and block_type = 'hero'
     and position = 0;

  -- ----------------------------------------------- long-form homepage copy
  -- Roughly 600 words of indexable text, split into four sections so each one
  -- renders its own <h2>. Removed and re-inserted on every run.
  delete from public.cms_page_blocks
   where page_id = v_home and data ? 'seo_key';

  select coalesce(max(position), -1) + 1 into v_pos
    from public.cms_page_blocks where page_id = v_home;

  insert into public.cms_page_blocks (page_id, block_type, position, data) values
  (v_home, 'rich_text', v_pos, jsonb_build_object(
    'seo_key', 'about-workrotighar',
    'variant', 'default',
    'align', 'left',
    'title', 'About Workrotighar — the Roti Ghar community kitchen',
    'body', 'Workrotighar is the online home of Roti Ghar, a volunteer-run community kitchen and ration support initiative built on one plain idea: no neighbour should sleep hungry. What started as a handful of people weighing rice and flour in a borrowed store room is now a steady monthly round of ration kits, carried door to door to households that would otherwise go without. Everything published on this site — the impact figures, the distribution records, the member community — is generated from that ongoing work rather than written for a brochure.

The name says what the work is. Roti is bread and ghar is home, so Roti Ghar is meant to be a home where bread is never short. The work itself is deliberately unglamorous and repetitive: find a household, confirm the need quietly, pack a standard kit, deliver it with dignity, and record it so that next month begins from facts instead of memory.'
  )),

  (v_home, 'rich_text', v_pos + 1, jsonb_build_object(
    'seo_key', 'how-the-work-reaches-families',
    'variant', 'default',
    'align', 'left',
    'title', 'How the work of Roti Ghar reaches a family',
    'body', 'Every family supported through Rotighar is referred by somebody who already knows them — a teacher, an imam, a shopkeeper, a neighbour. A volunteer visits, confirms the size of the household and records what is needed, without turning the visit into an interrogation. From there the work follows the same four steps every month: identify, pack, deliver, record.

A standard Roti Ghar ration kit is built to carry a family of five for roughly a month: rice, flour, dal, cooking oil, sugar, salt and tea. Kits go to the door at a time the family chooses. There are no queues, no photographs of faces and no conditions attached. Dignity is not something added on top of the work here; it is the work.'
  )),

  (v_home, 'rich_text', v_pos + 2, jsonb_build_object(
    'seo_key', 'why-volunteers-not-donations',
    'variant', 'default',
    'align', 'left',
    'title', 'Why the Roti Ghar work runs on volunteers, not public donations',
    'body', 'Workrotighar does not run public fundraising campaigns and does not collect money from the general public. That is a deliberate policy rather than an oversight. Roti Ghar operates through its own members and volunteers, who give time, transport, storage space, local knowledge and, when they choose to, ration in kind.

Keeping it that way keeps the work honest. Every distribution is logged against a family and a kit, every expense is recorded against the member who approved it, and the figures shown on this site are calculated from those records rather than typed in by hand. Members can see the ledger they are part of, which is the only kind of accountability that survives contact with a busy month. Nobody from Roti Ghar will ever ask a member of the public for a bank transfer, a UPI PIN or card details. If somebody does, it is not us.'
  )),

  (v_home, 'rich_text', v_pos + 3, jsonb_build_object(
    'seo_key', 'work-with-rotighar',
    'variant', 'default',
    'align', 'left',
    'title', 'Work with Rotighar — join the community',
    'body', 'Members apply through this site, are approved by an administrator, and then work inside a shared space built for exactly this: a feed for organising packing days, a member directory, ration and distribution records, reminders for the next round, and a running account of who contributed what. Volunteers usually pack at weekends and deliver on weekday evenings, so a few hours a month is genuinely enough to be useful.

If you can spare that, apply to volunteer. If you would rather help in kind, offer a sack of rice, a vehicle for a delivery run, dry storage, or an introduction to a family who needs us. And if you came here simply looking for Roti Ghar — the ration kits, the people, the monthly round, the work — this is the whole of it, kept in one place. Workrotighar is where it lives, and it is open to anybody willing to show up.'
  ));

  raise notice 'On-page SEO applied to the homepage (% content blocks added).', 4;
end;
$$;
