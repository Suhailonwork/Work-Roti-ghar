-- ============================================================================
-- Roti Ghar — homepage FAQ section
--
-- Adds a visible FAQ accordion to the homepage. The page reads these same
-- rows back out and emits FAQPage JSON-LD from them (see
-- `faqItemsFromBlocks` in lib/cms/render.ts), so the structured data and the
-- copy on screen can never disagree — which is exactly what Google requires
-- before it will grant an FAQ rich result.
--
-- Run this AFTER 0010_seo_workrotighar.sql so the FAQ sits below the
-- long-form brand copy rather than above it.
--
-- Safe to re-run: the block is deleted and re-inserted on every run.
-- ============================================================================

do $$
declare
  v_home uuid;
  v_pos  integer;
begin
  select id into v_home from public.cms_pages where is_home order by updated_at desc limit 1;
  if v_home is null then
    select id into v_home from public.cms_pages where slug = 'home' limit 1;
  end if;

  if v_home is null then
    raise exception 'No homepage found. Run 0005_seed.sql before this migration.';
  end if;

  -- Replace rather than duplicate.
  delete from public.cms_page_blocks
   where page_id = v_home and block_type = 'faq';

  select coalesce(max(position), -1) + 1 into v_pos
    from public.cms_page_blocks where page_id = v_home;

  insert into public.cms_page_blocks (page_id, block_type, position, data)
  values (v_home, 'faq', v_pos, jsonb_build_object(
    'id', 'faq',
    'title', 'Frequently asked questions',
    'subtitle', 'What Roti Ghar does, who it helps, and how to be part of the work.',
    'open_first', true,
    'items', jsonb_build_array(
      jsonb_build_object(
        'question', 'What is Roti Ghar?',
        'answer', $q$Roti Ghar is a community initiative focused on helping families in need by providing essential monthly ration kits. The work is carried out by volunteers who contribute their own time and resources to support their local community.$q$
      ),
      jsonb_build_object(
        'question', 'What does Roti Ghar provide?',
        'answer', $q$Roti Ghar provides monthly ration kits containing essential household food items such as rice, flour, dal, cooking oil, sugar, salt and tea, depending on the family's requirements.$q$
      ),
      jsonb_build_object(
        'question', 'Who can receive help from Roti Ghar?',
        'answer', $q$Roti Ghar supports families who are identified as being in genuine need. Members can refer families they personally know, after which volunteers visit and verify their requirements.$q$
      ),
      jsonb_build_object(
        'question', 'How does Roti Ghar identify families in need?',
        'answer', $q$Families are generally referred by members of the community. A volunteer visits the household, understands their situation, confirms the need and records the household details before assistance is provided.$q$
      ),
      jsonb_build_object(
        'question', 'How often does Roti Ghar distribute ration?',
        'answer', $q$Roti Ghar follows a monthly distribution system. Eligible families receive their ration kit regularly, helping provide consistent household food support.$q$
      ),
      jsonb_build_object(
        'question', 'Who funds Roti Ghar''s work?',
        'answer', $q$Roti Ghar does not accept public charity or general donations. The monthly ration kits are funded and prepared by its own volunteers, who contribute their time and resources.$q$
      ),
      jsonb_build_object(
        'question', 'Can I become a Roti Ghar volunteer?',
        'answer', $q$Yes. People who want to contribute their time and resources can become part of the Roti Ghar volunteer network and help with identifying families, preparing ration kits, distribution and community work.$q$
      ),
      jsonb_build_object(
        'question', 'Can I refer a family to Roti Ghar?',
        'answer', $q$Yes. Members can refer families they personally know who may need monthly ration support. The volunteer team then visits the family and assesses their requirements.$q$
      ),
      jsonb_build_object(
        'question', 'Where does Roti Ghar operate?',
        'answer', $q$Roti Ghar operates through multiple branches in different areas. Each branch works within its local community to identify families in need and provide them with regular monthly ration support.$q$
      ),
      jsonb_build_object(
        'question', 'How does the Roti Ghar branch system work?',
        'answer', $q$Each Roti Ghar branch serves its surrounding area. Local volunteers identify families who need support, prepare monthly ration kits and coordinate their distribution while maintaining proper records.$q$
      ),
      jsonb_build_object(
        'question', 'Can a new Roti Ghar branch be started in another area?',
        'answer', $q$Roti Ghar is built around community participation and local volunteer work. People interested in establishing or contributing to a branch can contact the Roti Ghar team to learn about the process and requirements.$q$
      )
    )
  ));

  -- The FAQ answers introduce "branch" as a term worth ranking for.
  insert into public.cms_seo (page_id) values (v_home)
  on conflict (page_id) do nothing;

  -- Dedupe while keeping first-seen order: the earlier a keyword appears, the
  -- more weight an editor gave it, and array_agg(distinct ...) would lose that.
  update public.cms_seo
     set keywords = (
           select array_agg(k order by first_seen)
             from (
               select k, min(ord) as first_seen
                 from unnest(keywords || array[
                        'roti ghar branch', 'rotighar branch', 'roti ghar faq',
                        'roti ghar volunteer', 'refer a family', 'monthly ration kit'
                      ]) with ordinality as t(k, ord)
                group by k
             ) deduped
         ),
         updated_at = now()
   where page_id = v_home;

  raise notice 'Homepage FAQ section added (11 questions).';
end;
$$;
