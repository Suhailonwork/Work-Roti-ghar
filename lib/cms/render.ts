import type { CmsPageBlock, Json } from '@/types/database';

/**
 * Block data is JSONB, so every read has to survive a missing or wrong-typed
 * field — an admin can delete a value at any time and the page must still render.
 */
export type BlockData = Record<string, Json | undefined>;

export function str(data: BlockData, key: string, fallback = ''): string {
  const value = data?.[key];
  return typeof value === 'string' ? value : fallback;
}

export function num(data: BlockData, key: string, fallback = 0): number {
  const value = data?.[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function bool(data: BlockData, key: string, fallback = false): boolean {
  const value = data?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function list(data: BlockData, key: string): BlockData[] {
  const value = data?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BlockData => typeof item === 'object' && item !== null && !Array.isArray(item));
}


export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Pulls the question/answer pairs out of the visible `faq` blocks on a page.
 *
 * FAQPage structured data is only valid when the same text is visible to the
 * reader, so the JSON-LD is generated from the rendered blocks rather than
 * kept in a parallel list that an editor could silently put out of date.
 * Hidden blocks are skipped for the same reason — their answers are not on
 * the page, so they must not appear in the markup either.
 */
export function faqItemsFromBlocks(blocks: CmsPageBlock[]): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    if (block.block_type !== 'faq' || !block.is_visible) continue;

    for (const row of list((block.data ?? {}) as BlockData, 'items')) {
      const question = str(row, 'question').trim();
      // Paragraph breaks carry no meaning in a JSON-LD string value.
      const answer = str(row, 'answer').replace(/\s+/g, ' ').trim();
      const key = question.toLowerCase();
      if (!question || !answer || seen.has(key)) continue;
      seen.add(key);
      items.push({ question, answer });
    }
  }

  return items;
}

export interface CtaLink {
  label: string;
  href: string;
}

/** Returns a link only when it has both a label and a destination. */
export function link(data: BlockData, key: string): CtaLink | null {
  const value = data?.[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, Json | undefined>;
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const href = typeof record.href === 'string' ? record.href.trim() : '';
  if (!label || !href) return null;
  return { label, href };
}

/**
 * Only allows destinations we are willing to render as links — an internal
 * path, or an http(s)/mailto/tel URL. Blocks `javascript:` and friends.
 */
export function safeHref(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  if (value.startsWith('/') || value.startsWith('#')) return value;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return null;
}

/** Turns a YouTube or Vimeo watch URL into its embeddable form. */
export function embedUrl(raw: string): { kind: 'iframe' | 'video'; src: string } | null {
  const url = raw.trim();
  if (!url) return null;

  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (youtube) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` };

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'video', src: url };
  if (/^https?:\/\//i.test(url)) return { kind: 'iframe', src: url };
  return null;
}
