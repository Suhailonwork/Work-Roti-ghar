/**
 * The block catalogue.
 *
 * Each entry declares the fields an admin can edit, which drives *both* the
 * generic editor in `/admin/website` and the defaults used when a block is
 * added. Adding a new block type means: add an entry here, then add a case to
 * `components/cms/BlockRenderer.tsx`. No other file needs to change.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'image'
  | 'link'
  | 'repeater';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For `repeater`: the shape of each row. */
  fields?: FieldDef[];
  /** For `repeater`: label used on the "add" button. */
  itemLabel?: string;
  required?: boolean;
}

export interface BlockDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
}

const LINK_FIELDS: FieldDef[] = [
  { name: 'label', label: 'Button label', type: 'text', placeholder: 'Become a volunteer' },
  { name: 'href', label: 'Links to', type: 'text', placeholder: '/signup' },
];

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centred' },
];

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Large opening section with a headline, intro and call to action.',
    icon: 'panel-top',
    fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'Roti Ghar' },
      { name: 'title', label: 'Headline', type: 'text', required: true },
      { name: 'subtitle', label: 'Intro paragraph', type: 'textarea' },
      { name: 'image_url', label: 'Image', type: 'image' },
      { name: 'image_alt', label: 'Image alt text', type: 'text', help: 'Describe the image for screen readers and search engines.' },
      { name: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
      { name: 'primary_cta', label: 'Primary button', type: 'link' },
      { name: 'secondary_cta', label: 'Secondary button', type: 'link' },
    ],
    defaults: {
      eyebrow: '',
      title: 'A headline for this page',
      subtitle: '',
      image_url: '',
      image_alt: '',
      align: 'left',
      primary_cta: { label: '', href: '' },
      secondary_cta: { label: '', href: '' },
    },
  },
  {
    type: 'rich_text',
    label: 'Rich text',
    description: 'A block of body copy, optionally styled as a highlighted notice.',
    icon: 'text',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'richtext', help: 'Leave a blank line between paragraphs.' },
      {
        name: 'variant',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'notice', label: 'Highlighted notice' },
          { value: 'muted', label: 'Muted' },
        ],
      },
      { name: 'align', label: 'Alignment', type: 'select', options: ALIGN_OPTIONS },
    ],
    defaults: { title: '', body: '', variant: 'default', align: 'left' },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'A single full-width image with an optional caption.',
    icon: 'image',
    fields: [
      { name: 'url', label: 'Image', type: 'image', required: true },
      { name: 'alt', label: 'Alt text', type: 'text', required: true },
      { name: 'caption', label: 'Caption', type: 'text' },
    ],
    defaults: { url: '', alt: '', caption: '' },
  },
  {
    type: 'image_text',
    label: 'Image + text',
    description: 'An image beside a heading and body copy.',
    icon: 'columns-2',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'richtext' },
      { name: 'image_url', label: 'Image', type: 'image' },
      { name: 'image_alt', label: 'Image alt text', type: 'text' },
      {
        name: 'image_side',
        label: 'Image position',
        type: 'select',
        options: [
          { value: 'left', label: 'Left of the text' },
          { value: 'right', label: 'Right of the text' },
        ],
      },
      { name: 'cta', label: 'Button', type: 'link' },
    ],
    defaults: { title: '', body: '', image_url: '', image_alt: '', image_side: 'right', cta: { label: '', href: '' } },
  },
  {
    type: 'hadith',
    label: 'Hadith / Ayah',
    description: 'A quoted verse or narration with its reference.',
    icon: 'quote',
    fields: [
      { name: 'arabic', label: 'Arabic text', type: 'textarea' },
      { name: 'text', label: 'Translation', type: 'textarea', required: true },
      { name: 'reference', label: 'Reference', type: 'text', placeholder: 'Surah Al-Insan 76:8' },
      { name: 'translation', label: 'Note', type: 'text' },
    ],
    defaults: { arabic: '', text: '', reference: '', translation: '' },
  },
  {
    type: 'statistics',
    label: 'Statistics',
    description: 'Impact figures, either typed in or pulled live from distribution records.',
    icon: 'bar-chart-3',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      {
        name: 'source',
        label: 'Figures come from',
        type: 'select',
        options: [
          { value: 'live', label: 'Live records' },
          { value: 'manual', label: 'Typed in below' },
        ],
        help: 'Live figures update themselves from the distribution and member tables.',
      },
      {
        name: 'items',
        label: 'Figures',
        type: 'repeater',
        itemLabel: 'figure',
        fields: [
          {
            name: 'key',
            label: 'Live metric',
            type: 'select',
            help: 'Used when the source is set to live records.',
            options: [
              { value: 'families_helped', label: 'Families supported' },
              { value: 'kits_distributed', label: 'Ration kits delivered' },
              { value: 'distributions', label: 'Distribution rounds' },
              { value: 'active_members', label: 'Active members' },
              { value: 'volunteers', label: 'Active volunteers' },
              { value: 'areas_served', label: 'Areas served' },
            ],
          },
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text', help: 'Used when the source is set to typed in.' },
          { name: 'suffix', label: 'Suffix', type: 'text', placeholder: '+' },
        ],
      },
    ],
    defaults: { title: '', subtitle: '', source: 'live', items: [] },
  },
  {
    type: 'cards',
    label: 'Cards',
    description: 'A row of cards — good for steps, services or values.',
    icon: 'layout-grid',
    fields: [
      { name: 'id', label: 'Anchor id', type: 'text', help: 'Lets you link to this section with #your-id.' },
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      {
        name: 'columns',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: 'Two' },
          { value: '3', label: 'Three' },
          { value: '4', label: 'Four' },
        ],
      },
      {
        name: 'items',
        label: 'Cards',
        type: 'repeater',
        itemLabel: 'card',
        fields: [
          { name: 'icon', label: 'Icon', type: 'text', placeholder: 'package', help: 'A lucide icon name, e.g. package, truck, heart.' },
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'body', label: 'Body', type: 'textarea' },
          { name: 'image_url', label: 'Image', type: 'image' },
          { name: 'href', label: 'Links to', type: 'text' },
        ],
      },
    ],
    defaults: { id: '', title: '', subtitle: '', columns: '3', items: [] },
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'A grid of photographs.',
    icon: 'images',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      {
        name: 'layout',
        label: 'Layout',
        type: 'select',
        options: [
          { value: 'grid', label: 'Even grid' },
          { value: 'masonry', label: 'Mixed heights' },
        ],
      },
      {
        name: 'items',
        label: 'Images',
        type: 'repeater',
        itemLabel: 'image',
        fields: [
          { name: 'url', label: 'Image', type: 'image' },
          { name: 'alt', label: 'Alt text', type: 'text' },
          { name: 'caption', label: 'Caption', type: 'text' },
        ],
      },
    ],
    defaults: { title: '', subtitle: '', layout: 'grid', items: [] },
  },
  {
    type: 'video',
    label: 'Video',
    description: 'An embedded YouTube or Vimeo video, or a hosted MP4.',
    icon: 'play',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'url', label: 'Video URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…', required: true },
      { name: 'caption', label: 'Caption', type: 'text' },
      { name: 'poster_url', label: 'Poster image', type: 'image' },
    ],
    defaults: { title: '', url: '', caption: '', poster_url: '' },
  },
  {
    type: 'cta',
    label: 'Call to action',
    description: 'A banner inviting the reader to do something.',
    icon: 'megaphone',
    fields: [
      { name: 'title', label: 'Heading', type: 'text', required: true },
      { name: 'body', label: 'Body', type: 'textarea' },
      {
        name: 'variant',
        label: 'Style',
        type: 'select',
        options: [
          { value: 'primary', label: 'Solid green' },
          { value: 'soft', label: 'Soft cream' },
        ],
      },
      { name: 'primary_cta', label: 'Primary button', type: 'link' },
      { name: 'secondary_cta', label: 'Secondary button', type: 'link' },
    ],
    defaults: {
      title: '',
      body: '',
      variant: 'primary',
      primary_cta: { label: '', href: '' },
      secondary_cta: { label: '', href: '' },
    },
  },
  {
    type: 'community_posts',
    label: 'Community posts',
    description:
      'Recent activity from the members-only feed. Visitors who are not approved members see an invitation to join instead of the posts themselves.',
    icon: 'users',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      { name: 'limit', label: 'How many posts', type: 'number' },
    ],
    defaults: { title: 'From the community', subtitle: '', limit: 3 },
  },
  {
    type: 'faq',
    label: 'FAQ',
    description:
      'Questions and answers in an accordion. Emits FAQPage structured data automatically, so the answers can win a rich result on brand searches.',
    icon: 'circle-help',
    fields: [
      { name: 'id', label: 'Anchor id', type: 'text', help: 'Lets you link to this section with #your-id.' },
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      {
        name: 'items',
        label: 'Questions',
        type: 'repeater',
        itemLabel: 'question',
        fields: [
          { name: 'question', label: 'Question', type: 'text' },
          {
            name: 'answer',
            label: 'Answer',
            type: 'textarea',
            help: 'Answer the question fully in the first sentence — that is the part Google shows.',
          },
        ],
      },
      {
        name: 'open_first',
        label: 'Open the first question by default',
        type: 'boolean',
      },
    ],
    defaults: { id: 'faq', title: 'Frequently asked questions', subtitle: '', items: [], open_first: true },
  },
  {
    type: 'contact_details',
    label: 'Contact details',
    description:
      'Email, phone, address and social links, read live from Settings → Organisation. Nothing to retype here — change the details once in Settings and every page that uses this block follows.',
    icon: 'mail',
    fields: [
      { name: 'id', label: 'Anchor id', type: 'text', help: 'Lets you link to this section with #your-id.' },
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'subtitle', label: 'Sub-heading', type: 'text' },
      { name: 'show_socials', label: 'Show social links', type: 'boolean' },
      { name: 'cta', label: 'Button', type: 'link' },
    ],
    defaults: {
      id: '',
      title: 'Contact Roti Ghar',
      subtitle: '',
      show_socials: true,
      cta: { label: '', href: '' },
    },
  },
  {
    type: 'custom',
    label: 'Custom content',
    description: 'A free-form section with its own background and width.',
    icon: 'square-pen',
    fields: [
      { name: 'title', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'richtext' },
      {
        name: 'background',
        label: 'Background',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'cream', label: 'Cream' },
          { value: 'brand', label: 'Deep green' },
        ],
      },
      {
        name: 'width',
        label: 'Width',
        type: 'select',
        options: [
          { value: 'narrow', label: 'Narrow' },
          { value: 'default', label: 'Default' },
          { value: 'wide', label: 'Wide' },
        ],
      },
    ],
    defaults: { title: '', body: '', background: 'none', width: 'default' },
  },
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((b) => [b.type, b]),
);

export function getBlockDef(type: string): BlockDef | undefined {
  return BLOCK_MAP[type];
}

export function blockLabel(type: string): string {
  return BLOCK_MAP[type]?.label ?? type;
}

export function defaultBlockData(type: string): Record<string, unknown> {
  return structuredClone(BLOCK_MAP[type]?.defaults ?? {});
}

/** A short human summary of a block, shown in the admin block list. */
export function blockSummary(type: string, data: Record<string, unknown>): string {
  const pick = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');
  const first = pick('title') || pick('text') || pick('alt') || pick('body') || pick('url');
  if (first) return first.length > 80 ? `${first.slice(0, 79)}…` : first;
  const items = data.items;
  if (Array.isArray(items)) return `${items.length} item${items.length === 1 ? '' : 's'}`;
  return BLOCK_MAP[type]?.description ?? '';
}
