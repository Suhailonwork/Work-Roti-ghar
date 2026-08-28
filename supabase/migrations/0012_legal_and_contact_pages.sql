-- ============================================================================
-- Roti Ghar — Contact, Privacy Policy and Terms & Conditions pages
--
-- Adds three CMS pages, each at its own crawlable URL:
--
--   /contact                 Contact Us
--   /privacy-policy          Privacy Policy
--   /terms-and-conditions    Terms & Conditions
--
-- ("About us" already exists at /about from 0005_seed.sql and keeps the SEO
-- 0010 gave it — this migration only links to it.)
--
-- Because they are CMS pages they inherit the whole existing pipeline for
-- free: server-rendered HTML at a real URL, canonical + Open Graph + Twitter
-- tags from `buildPageMetadata`, breadcrumb JSON-LD, automatic inclusion in
-- /sitemap.xml via `getIndexablePages`, and full editing in /admin/website.
--
-- A `cards` block on the homepage links to all four, so every new page is
-- reachable in one click from the site's strongest page.
--
-- Run AFTER 0010 and 0011. Safe to re-run: pages are upserted by slug and
-- their blocks are rebuilt from scratch on every run.
--
-- NOTE: the legal copy below describes how this application actually behaves
-- (Supabase-hosted, admin-approved membership, private beneficiary records,
-- no public donations). It is written to be accurate, not to be legal advice
-- — have a lawyer review it, and set the governing-law line in the Terms to
-- your actual city and jurisdiction before relying on it.
-- ============================================================================

do $$
declare
  v_home    uuid;
  v_contact uuid;
  v_privacy uuid;
  v_terms   uuid;
  v_pos     integer;
  v_updated constant text := '28 August 2026';
begin
  select id into v_home from public.cms_pages where is_home order by updated_at desc limit 1;
  if v_home is null then
    select id into v_home from public.cms_pages where slug = 'home' limit 1;
  end if;

  -- ------------------------------------------------------------ create pages
  insert into public.cms_pages (slug, title, status, is_home, published_at)
  values
    ('contact',              'Contact Us',         'published', false, now()),
    ('privacy-policy',       'Privacy Policy',     'published', false, now()),
    ('terms-and-conditions', 'Terms & Conditions', 'published', false, now())
  on conflict (slug) do update
    set title        = excluded.title,
        status       = 'published',
        published_at = coalesce(cms_pages.published_at, now()),
        updated_at   = now();

  select id into v_contact from public.cms_pages where slug = 'contact';
  select id into v_privacy from public.cms_pages where slug = 'privacy-policy';
  select id into v_terms   from public.cms_pages where slug = 'terms-and-conditions';

  insert into public.cms_seo (page_id)
  values (v_contact), (v_privacy), (v_terms)
  on conflict (page_id) do nothing;

  -- Rebuild the blocks for these three pages only. Nothing else is touched.
  delete from public.cms_page_blocks
   where page_id in (v_contact, v_privacy, v_terms);

  -- ============================================================== contact ===
  update public.cms_seo
     set seo_title           = 'Contact Roti Ghar — Workrotighar',
         meta_description    = 'Contact the Roti Ghar volunteer team. Email, phone and address for Workrotighar — refer a family, offer help in kind, or ask about starting a branch in your area.',
         canonical_url       = 'https://workrotighar.com/contact',
         og_title            = 'Contact Roti Ghar — Workrotighar',
         og_description      = 'Get in touch with the Roti Ghar volunteer team — refer a family, offer help in kind, or ask about a branch in your area.',
         og_image_url        = coalesce(nullif(og_image_url, ''), '/og-image'),
         og_image_alt        = 'Contact Roti Ghar',
         twitter_card        = 'summary_large_image',
         twitter_title       = 'Contact Roti Ghar — Workrotighar',
         twitter_description = 'Email, phone and address for the Roti Ghar volunteer team.',
         no_index            = false,
         keywords            = array[
           'contact roti ghar', 'roti ghar contact number', 'rotighar contact',
           'workrotighar contact', 'roti ghar address', 'roti ghar branch',
           'refer a family'
         ],
         updated_at          = now()
   where page_id = v_contact;

  insert into public.cms_page_blocks (page_id, block_type, position, data) values
  (v_contact, 'hero', 0, jsonb_build_object(
    'eyebrow', 'Workrotighar',
    'title', 'Contact Roti Ghar',
    'subtitle', 'Refer a family, offer help in kind, ask about a branch in your area, or raise a concern about how we work. A volunteer reads everything that comes in.',
    'align', 'center'
  )),

  (v_contact, 'rich_text', 1, jsonb_build_object(
    'variant', 'default',
    'align', 'left',
    'title', 'How to reach the Roti Ghar team',
    'body', $q$Roti Ghar is run by volunteers rather than paid staff, so replies come in the evenings and at weekends more often than during office hours. We aim to answer within a few days.

Please use the details below for anything to do with the work: referring a household that needs monthly ration support, offering rice, flour, transport or dry storage, asking how to volunteer, questions about starting or joining a branch in your area, or a correction to something published on this site.$q$
  )),

  (v_contact, 'contact_details', 2, jsonb_build_object(
    'id', 'contact-details',
    'title', 'Contact details',
    'subtitle', 'The fastest way to reach us is email.',
    'show_socials', true,
    'cta', jsonb_build_object('label', 'Offer support instead', 'href', '/support')
  )),

  (v_contact, 'rich_text', 3, jsonb_build_object(
    'variant', 'notice',
    'align', 'left',
    'title', 'What we will never ask you for',
    'body', $q$Roti Ghar does not collect money from the general public. Nobody from Roti Ghar will ever contact you asking for a bank transfer, a UPI PIN, an OTP or card details, and we do not run public fundraising campaigns.

If somebody approaches you claiming to collect donations for Roti Ghar, it is not us. Please tell us using the details above so we can warn others.$q$
  )),

  (v_contact, 'cta', 4, jsonb_build_object(
    'title', 'Would you rather join the work?',
    'body', 'Members are approved by an administrator and then help with packing days, delivery runs and the community feed.',
    'variant', 'primary',
    'primary_cta', jsonb_build_object('label', 'Apply to volunteer', 'href', '/signup'),
    'secondary_cta', jsonb_build_object('label', 'About Roti Ghar', 'href', '/about')
  ));

  -- ======================================================= privacy policy ===
  update public.cms_seo
     set seo_title           = 'Privacy Policy — Roti Ghar | Workrotighar',
         meta_description    = 'How Roti Ghar collects, uses and protects personal information on workrotighar.com — member accounts, family records, photographs and the support form.',
         canonical_url       = 'https://workrotighar.com/privacy-policy',
         og_title            = 'Privacy Policy — Roti Ghar',
         og_description      = 'What Roti Ghar collects, why, who can see it, and how long it is kept.',
         og_image_url        = coalesce(nullif(og_image_url, ''), '/og-image'),
         og_image_alt        = 'Roti Ghar privacy policy',
         twitter_card        = 'summary_large_image',
         twitter_title       = 'Privacy Policy — Roti Ghar',
         twitter_description = 'What Roti Ghar collects, why, who can see it, and how long it is kept.',
         no_index            = false,
         keywords            = array[
           'roti ghar privacy policy', 'rotighar privacy', 'workrotighar privacy policy',
           'data protection', 'privacy'
         ],
         updated_at          = now()
   where page_id = v_privacy;

  insert into public.cms_page_blocks (page_id, block_type, position, data) values
  (v_privacy, 'hero', 0, jsonb_build_object(
    'eyebrow', 'Workrotighar',
    'title', 'Privacy Policy',
    'subtitle', 'Last updated: ' || v_updated || '. This policy explains what Roti Ghar collects on workrotighar.com, why we collect it, and who can see it.',
    'align', 'center'
  )),

  (v_privacy, 'rich_text', 1, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Who this policy covers',
    'body', $q$This policy applies to workrotighar.com, the website of Roti Ghar, and to the members-only area behind it. It covers three groups of people: visitors who simply read the site, members and volunteers who hold an account, and the families we support, whose records are handled with the most care of all.

By using this site you agree to the handling of information described here. If you disagree with any part of it, please stop using the site and contact us so we can deal with your information appropriately.$q$
  )),

  (v_privacy, 'rich_text', 2, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'What we collect',
    'body', $q$If you only read the public pages, we do not ask you for anything. No account is needed and we do not require you to identify yourself.

If you apply to become a member or volunteer, we collect the details you enter on the application form — your name, email address, contact number and anything you choose to tell us about yourself — together with the password you set, which is stored only as a cryptographic hash that nobody at Roti Ghar can read or reverse.

If you become a member, we additionally hold what you create inside the members area: your profile and photograph, posts and comments in the community feed, records of ration kits you helped pack or deliver, contributions you made in kind, and any files you upload.

If you submit the support form, we keep the name and contact details you give us along with your message, so a volunteer can reply.

Records about the families we support — household size, circumstances and what was delivered — are recorded by volunteers during a visit. These are the most sensitive records we hold and are treated accordingly.$q$
  )),

  (v_privacy, 'rich_text', 3, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Why we use it',
    'body', $q$We use personal information only to run the work. That means: deciding on membership applications; letting you sign in and use the members area; organising packing days and delivery rounds; keeping an honest record of contributions and expenses so members can see the ledger they are part of; making sure a family is served once per round rather than twice or not at all; and replying when you contact us.

We do not sell personal information. We do not share it with advertisers, we do not run advertising or third-party tracking on this site, and we do not use your information to build a profile of you for marketing.$q$
  )),

  (v_privacy, 'rich_text', 4, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Who can see what',
    'body', $q$Access is restricted in the software itself, not merely by policy. Every table enforces row-level security, so a request that is not entitled to a record simply does not receive it.

Public pages are visible to everybody. The community feed, the member directory, ration records and the contribution ledger are visible only to approved members who are signed in. Administrative screens — applications, finance, audit logs, beneficiary records — are restricted to administrators.

Records about the families we support are visible only to administrators and to the volunteers running a distribution. We do not publish family names, addresses or photographs of recipients on the public site, and we ask members not to photograph faces during a delivery.$q$
  )),

  (v_privacy, 'rich_text', 5, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Photographs, cookies and where data is stored',
    'body', $q$Photographs uploaded by members may appear in the members area, and photographs of the work — packing, storage, vehicles — may appear on the public site. We do not publish identifiable photographs of the families we serve. If a photograph of you appears anywhere on this site and you would like it removed, ask us and we will remove it.

We use cookies only to keep you signed in and to keep your session secure. There are no advertising cookies, no analytics cookies and no third-party trackers on this site. Clearing these cookies signs you out; it does not otherwise affect the site.

The site and its database are hosted on Supabase, which stores the data and processes it on our instructions as our hosting provider. Email you send us is held in our email account.$q$
  )),

  (v_privacy, 'rich_text', 6, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'How long we keep it, and your choices',
    'body', $q$Member accounts and their records are kept while the account is active. Distribution and finance records are kept as the historical record of the work, because a ledger that can be quietly rewritten is not a ledger. Support-form messages are kept until they have been dealt with and for a reasonable period afterwards.

You may ask us at any time to see a copy of the information we hold about you, correct anything that is wrong, delete your account, or withdraw an application. Write to us using the details on the contact page and we will act on it. Where a record must be kept for the integrity of the ledger, we will tell you which record and why, and remove your personal details from it where we can.

This site is not intended for children, and we do not knowingly create accounts for anyone under 18.$q$
  )),

  (v_privacy, 'rich_text', 7, jsonb_build_object(
    'variant', 'notice', 'align', 'left',
    'title', 'Changes and how to reach us',
    'body', $q$If this policy changes we will update the date at the top of this page. Material changes will be announced to members in the community feed.

Questions about privacy, or a request about your own information, should go to the addresses on our contact page.$q$
  )),

  (v_privacy, 'cta', 8, jsonb_build_object(
    'title', 'Questions about your information?',
    'body', 'A volunteer will answer. Ask us anything about what we hold and why.',
    'variant', 'soft',
    'primary_cta', jsonb_build_object('label', 'Contact us', 'href', '/contact'),
    'secondary_cta', jsonb_build_object('label', 'Terms & Conditions', 'href', '/terms-and-conditions')
  ));

  -- =================================================== terms & conditions ===
  update public.cms_seo
     set seo_title           = 'Terms & Conditions — Roti Ghar | Workrotighar',
         meta_description    = 'The terms for using workrotighar.com and the Roti Ghar members area — membership, acceptable use, confidentiality of family records, and our no-public-donations policy.',
         canonical_url       = 'https://workrotighar.com/terms-and-conditions',
         og_title            = 'Terms & Conditions — Roti Ghar',
         og_description      = 'The rules for using workrotighar.com and the Roti Ghar members area.',
         og_image_url        = coalesce(nullif(og_image_url, ''), '/og-image'),
         og_image_alt        = 'Roti Ghar terms and conditions',
         twitter_card        = 'summary_large_image',
         twitter_title       = 'Terms & Conditions — Roti Ghar',
         twitter_description = 'The rules for using workrotighar.com and the Roti Ghar members area.',
         no_index            = false,
         keywords            = array[
           'roti ghar terms and conditions', 'rotighar terms', 'workrotighar terms',
           'terms of use', 'membership terms'
         ],
         updated_at          = now()
   where page_id = v_terms;

  insert into public.cms_page_blocks (page_id, block_type, position, data) values
  (v_terms, 'hero', 0, jsonb_build_object(
    'eyebrow', 'Workrotighar',
    'title', 'Terms & Conditions',
    'subtitle', 'Last updated: ' || v_updated || '. These terms cover the use of workrotighar.com and the Roti Ghar members area.',
    'align', 'center'
  )),

  (v_terms, 'rich_text', 1, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Accepting these terms',
    'body', $q$By using workrotighar.com, applying for membership, or signing in to the members area, you accept these terms. If you do not accept them, please do not use the site.

Roti Ghar is a volunteer-run community initiative rather than a commercial service. Nothing on this site is an offer of employment, and volunteering with Roti Ghar does not create an employment relationship.$q$
  )),

  (v_terms, 'rich_text', 2, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Membership and your account',
    'body', $q$Anyone aged 18 or over may apply to join. Applications are reviewed by an administrator and approval is at our discretion; we are not obliged to give a reason for declining one. Until an application is approved the account stays pending and cannot see member content.

You are responsible for your account. Give accurate details when you apply, keep them current, choose a password you do not use elsewhere, and do not share your sign-in with anybody. Tell us immediately if you think somebody else has access to your account. You may close your account at any time.$q$
  )),

  (v_terms, 'rich_text', 3, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'How you may use the site',
    'body', $q$Use the site for the work of Roti Ghar and nothing else. You agree not to post anything unlawful, abusive, hateful, harassing, misleading or obscene; not to impersonate anybody; not to upload malware; not to scrape, probe or attempt to bypass the access controls; not to use the member directory or any records to send marketing; and not to use the site to solicit money in the name of Roti Ghar.

Treat other members as you would at a packing table. Disagree honestly, do not make it personal, and remember that the feed is a shared record of the work.$q$
  )),

  (v_terms, 'rich_text', 4, jsonb_build_object(
    'variant', 'notice', 'align', 'left',
    'title', 'Confidentiality of the families we serve',
    'body', $q$This is the term we take most seriously. Information about the households Roti Ghar supports — names, addresses, circumstances, photographs — is shared with you only so that you can do the work.

You must not copy it, republish it, post it to social media, or discuss identifiable details outside the volunteer team. Do not photograph the faces of recipients. Breaching this will end your membership immediately, and depending on what was disclosed it may also be a breach of law.$q$
  )),

  (v_terms, 'rich_text', 5, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'What you post, and what we own',
    'body', $q$You keep ownership of the posts, comments and photographs you upload. By posting them you give Roti Ghar a non-exclusive, royalty-free licence to store and display them on this site for the purposes of the work, including on public pages where the content relates to the work rather than to a family we serve. You confirm that you have the right to post what you upload and the consent of anybody clearly identifiable in a photograph.

We may remove or edit content that breaches these terms. The Roti Ghar name, logo, site design and the text on this site belong to Roti Ghar unless stated otherwise.$q$
  )),

  (v_terms, 'rich_text', 6, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Money, donations and fraud',
    'body', $q$Roti Ghar does not accept donations or general charity from the public. Ration kits are funded and prepared by our own members and volunteers, who contribute their time and resources.

We will never ask you for a bank transfer, a UPI PIN, an OTP or card details. Anybody who does so while using the Roti Ghar name is not acting for us, and we ask you to report it. Contributions recorded in the members area are entries in our internal ledger and are not payments to Roti Ghar through this website.$q$
  )),

  (v_terms, 'rich_text', 7, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Availability, suspension and liability',
    'body', $q$The site is provided as it is. We run it on a volunteer footing and cannot promise it will always be available, uninterrupted or free of errors, and we may change or withdraw parts of it. Impact figures shown on the site are generated from our own records and are published in good faith.

We may suspend or end your membership if you break these terms, if you put the families we serve at risk, or if your conduct makes the work harder. Where it is fair to do so we will tell you why.

To the extent the law allows, Roti Ghar and its volunteers are not liable for indirect or consequential loss arising from your use of the site. Nothing in these terms limits liability that cannot be limited by law.$q$
  )),

  (v_terms, 'rich_text', 8, jsonb_build_object(
    'variant', 'default', 'align', 'left',
    'title', 'Changes, governing law and contact',
    'body', $q$We may update these terms. The date at the top of this page shows when they last changed, and continuing to use the site after a change means you accept the updated terms.

These terms are governed by the laws of India, and the courts of our home city have exclusive jurisdiction over any dispute arising from them.

Questions about these terms should go to the addresses on our contact page. How we handle personal information is described separately in our privacy policy.$q$
  )),

  (v_terms, 'cta', 9, jsonb_build_object(
    'title', 'Ready to join the work?',
    'body', 'Applications are reviewed by an administrator. A few hours a month is genuinely enough to be useful.',
    'variant', 'primary',
    'primary_cta', jsonb_build_object('label', 'Apply to volunteer', 'href', '/signup'),
    'secondary_cta', jsonb_build_object('label', 'Privacy Policy', 'href', '/privacy-policy')
  ));

  -- ================================ homepage links to all four pages ========
  -- Marked with `nav_key` so this block is replaced rather than duplicated on
  -- a re-run. Deliberately a different marker from 0010's `seo_key`, so the
  -- two migrations never delete each other's blocks.
  if v_home is not null then
    delete from public.cms_page_blocks
     where page_id = v_home and data ? 'nav_key';

    select coalesce(max(position), -1) + 1 into v_pos
      from public.cms_page_blocks where page_id = v_home;

    insert into public.cms_page_blocks (page_id, block_type, position, data) values
    (v_home, 'cards', v_pos, jsonb_build_object(
      'nav_key', 'site-pages',
      'id', 'more',
      'title', 'More about Roti Ghar',
      'subtitle', 'Who we are, how to reach us, and the terms this site runs on.',
      'columns', '4',
      'items', jsonb_build_array(
        jsonb_build_object(
          'title', 'About us',
          'body', 'Who runs Roti Ghar, how we choose the families we serve, and why the work is funded by our own members.',
          'href', '/about'
        ),
        jsonb_build_object(
          'title', 'Contact us',
          'body', 'Email, phone and address for the volunteer team. Refer a family or ask about a branch in your area.',
          'href', '/contact'
        ),
        jsonb_build_object(
          'title', 'Privacy Policy',
          'body', 'What we collect on workrotighar.com, why, who can see it, and how long we keep it.',
          'href', '/privacy-policy'
        ),
        jsonb_build_object(
          'title', 'Terms & Conditions',
          'body', 'Membership, acceptable use, confidentiality of family records, and our no-public-donations policy.',
          'href', '/terms-and-conditions'
        )
      )
    ));
  end if;

  raise notice 'Created /contact, /privacy-policy and /terms-and-conditions, and linked all four pages from the homepage.';
end;
$$;
