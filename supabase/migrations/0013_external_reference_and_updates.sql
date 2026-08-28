-- ============================================================================
-- Roti Ghar — outbound reference to the WORK Delhi Chapter, and a
-- "Community updates" section carrying a Facebook post.
--
-- Two separate additions:
--
--   1. /about gains a short "Related work" section with one natural editorial
--      link to https://workglobal.in/work-delhi-chapter/ — placed in a
--      sentence that explains why the reader would follow it, which is what
--      makes an outbound link worth anything. One link, descriptive anchor
--      text, no repetition of the brand terms.
--
--   2. The homepage gains a "Community updates" section built around a single
--      Facebook post. The post is NOT loaded until a reader clicks it, so it
--      adds no third-party JavaScript, no cookies and no layout shift to the
--      initial page load. The heading and intro copy around it are ordinary
--      indexable text — the embed itself lives in a third-party iframe and
--      contributes nothing to this page's content.
--
-- ---------------------------------------------------------------------------
-- SET THIS BEFORE RUNNING: paste the permalink of the Facebook post to embed.
-- Leave it empty and section 2 is skipped entirely; section 1 still applies.
-- Only https://facebook.com links are accepted by the renderer.
-- ---------------------------------------------------------------------------
--
-- Run AFTER 0012. Safe to re-run: both blocks are keyed and replaced.
-- ============================================================================

do $$
declare
  v_home  uuid;
  v_about uuid;
  v_pos   integer;

  -- ▼▼▼ PASTE THE FACEBOOK POST URL HERE ▼▼▼
  v_fb_post constant text := '';
  -- ▲▲▲ e.g. 'https://www.facebook.com/permalink.php?story_fbid=...&id=...' ▲▲▲
begin
  select id into v_home  from public.cms_pages where is_home order by updated_at desc limit 1;
  if v_home is null then
    select id into v_home from public.cms_pages where slug = 'home' limit 1;
  end if;
  select id into v_about from public.cms_pages where slug = 'about' limit 1;

  -- ================================================ 1. outbound reference ===
  if v_about is not null then
    delete from public.cms_page_blocks
     where page_id = v_about and data ? 'ref_key';

    select coalesce(max(position), -1) + 1 into v_pos
      from public.cms_page_blocks where page_id = v_about;

    insert into public.cms_page_blocks (page_id, block_type, position, data)
    values (v_about, 'rich_text', v_pos, jsonb_build_object(
      'ref_key', 'work-delhi-chapter',
      'variant', 'default',
      'align', 'left',
      'title', 'Related work elsewhere in India',
      'body', $q$Roti Ghar is one of many volunteer efforts working on food security in India, and we pay attention to the others. WORK, a charitable trust, runs a comparable programme through its [WORK Delhi Chapter](https://workglobal.in/work-delhi-chapter/), which operates a Roti Bank alongside free oxygen provision, fire relief and disaster response across Delhi.

Different city, different scale, same instinct: find the household that has been missed, confirm the need quietly, and turn up on a schedule people can rely on. If you are in Delhi and looking for work of this kind closer to home, they are worth your time.$q$
    ));

    raise notice 'Added the WORK Delhi Chapter reference to /about.';
  else
    raise notice 'No /about page found — skipped the outbound reference.';
  end if;

  -- ================================================= 2. community updates ===
  if v_home is not null and v_fb_post <> '' then
    delete from public.cms_page_blocks
     where page_id = v_home and block_type = 'social_embed';

    select coalesce(max(position), -1) + 1 into v_pos
      from public.cms_page_blocks where page_id = v_home;

    insert into public.cms_page_blocks (page_id, block_type, position, data)
    values (v_home, 'social_embed', v_pos, jsonb_build_object(
      'id', 'community-updates',
      'title', 'Community updates',
      'subtitle', 'Notes and photographs from recent packing days and delivery rounds.',
      'body', $q$Most of what Roti Ghar does is not announced anywhere — a kit packed on a Saturday, a delivery made on a weekday evening. What does get posted goes to our Facebook page, and the most recent update is below.$q$,
      'url', v_fb_post,
      'caption', 'A recent update from the Roti Ghar page'
    ));

    raise notice 'Added the Community updates section to the homepage.';
  else
    raise notice 'No Facebook post URL set (v_fb_post is empty) — skipped the Community updates section.';
  end if;
end;
$$;
