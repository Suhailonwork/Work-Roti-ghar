import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { CmsPage, CmsPageBlock, CmsSeo, ImpactStats, Json } from '@/types/database';

export interface RenderedPage {
  page: CmsPage;
  blocks: CmsPageBlock[];
  seo: CmsSeo | null;
}

/**
 * Loads a published page with its blocks and SEO record.
 *
 * RLS already hides drafts from anonymous visitors, but admins are allowed to
 * read everything — so `previewForAdmin` decides whether an unpublished page is
 * rendered or treated as missing.
 */
export const getPageBySlug = cache(async (slug: string, previewForAdmin = false): Promise<RenderedPage | null> => {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!page) return null;

  if (!previewForAdmin && !isLive(page)) return null;

  const [{ data: blocks }, { data: seo }] = await Promise.all([
    supabase
      .from('cms_page_blocks')
      .select('*')
      .eq('page_id', page.id)
      .order('position', { ascending: true }),
    supabase.from('cms_seo').select('*').eq('page_id', page.id).maybeSingle(),
  ]);

  return {
    page,
    blocks: (blocks ?? []).filter((b) => previewForAdmin || b.is_visible),
    seo: seo ?? null,
  };
});

/** The page flagged as the homepage, falling back to the `home` slug. */
export const getHomePage = cache(async (previewForAdmin = false): Promise<RenderedPage | null> => {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('is_home', true)
    .maybeSingle();

  if (page && (previewForAdmin || isLive(page))) {
    return getPageBySlug(page.slug, previewForAdmin);
  }

  return getPageBySlug('home', previewForAdmin);
});

/** A page counts as live when it is published, or scheduled and the time has passed. */
export function isLive(page: Pick<CmsPage, 'status' | 'publish_at'>): boolean {
  if (page.status === 'published') return true;
  if (page.status === 'scheduled' && page.publish_at) {
    return new Date(page.publish_at).getTime() <= Date.now();
  }
  return false;
}

/** Every live, indexable page — used to build the sitemap. */
export async function getIndexablePages(): Promise<
  { slug: string; updated_at: string; is_home: boolean }[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('cms_pages')
    .select('slug, updated_at, is_home, status, publish_at, cms_seo(no_index)')
    .in('status', ['published', 'scheduled']);

  if (!data) return [];

  return data
    .filter((row) => isLive(row))
    .filter((row) => {
      const seo = row.cms_seo as unknown as { no_index: boolean }[] | { no_index: boolean } | null;
      if (!seo) return true;
      const record = Array.isArray(seo) ? seo[0] : seo;
      return !record?.no_index;
    })
    .map((row) => ({ slug: row.slug, updated_at: row.updated_at, is_home: row.is_home }));
}

/** Aggregate impact figures for the statistics block. Safe for anonymous callers. */
export const getImpactStats = cache(async (): Promise<ImpactStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('impact_stats');

  const fallback: ImpactStats = {
    families_helped: 0,
    kits_distributed: 0,
    distributions: 0,
    active_members: 0,
    volunteers: 0,
    areas_served: 0,
  };

  if (error || !data) return fallback;
  return { ...fallback, ...(data as unknown as ImpactStats) };
});

/** Public site settings (organisation details, support policy, SEO defaults). */
export const getSetting = cache(async <T = Json>(key: string): Promise<T | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return (data?.value as T) ?? null;
});

export interface OrgSettings {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  socials: Record<string, string>;
}

export const getOrgSettings = cache(async (): Promise<OrgSettings> => {
  const value = await getSetting<Partial<OrgSettings>>('org');
  return {
    name: value?.name || 'Roti Ghar',
    tagline: value?.tagline || '',
    email: value?.email || '',
    phone: value?.phone || '',
    address: value?.address || '',
    socials: value?.socials || {},
  };
});

export interface SupportSettings {
  public_payments_enabled: boolean;
  policy_statement: string;
  methods: { label: string; detail: string }[];
  note: string;
}

export const getSupportSettings = cache(async (): Promise<SupportSettings> => {
  const value = await getSetting<Partial<SupportSettings>>('support');
  return {
    // Defaults to OFF. Roti Ghar's stated policy is that it does not take
    // donations from the public, so payment collection must be switched on
    // deliberately by an admin rather than shipped enabled.
    public_payments_enabled: value?.public_payments_enabled === true,
    policy_statement:
      value?.policy_statement ||
      'We do not take donations from the public. We operate through our volunteers and members.',
    methods: Array.isArray(value?.methods) ? value.methods : [],
    note: value?.note || '',
  };
});

export interface SeoDefaults {
  site_name: string;
  title: string;
  description: string;
  og_image: string;
  twitter_site: string;
}

export const getSeoDefaults = cache(async (): Promise<SeoDefaults> => {
  const value = await getSetting<Partial<SeoDefaults>>('seo_defaults');
  return {
    site_name: value?.site_name || 'Roti Ghar',
    title: value?.title || 'Roti Ghar',
    description: value?.description || '',
    // /og-image is a generated PNG. Social scrapers reject SVG, so an SVG
    // fallback here would mean no preview card at all.
    og_image: value?.og_image || '/og-image',
    twitter_site: value?.twitter_site || '',
  };
});
