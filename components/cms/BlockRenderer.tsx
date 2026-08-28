import type { CmsPageBlock, ImpactStats } from '@/types/database';
import { embedUrl, str, type BlockData } from '@/lib/cms/render';
import {
  CardsBlock,
  CtaBlock,
  CustomBlock,
  FaqBlock,
  GalleryBlock,
  HadithBlock,
  HeroBlock,
  ImageBlock,
  ImageTextBlock,
  RichTextBlock,
  SocialEmbedBlock,
  VideoBlock,
} from './blocks/ContentBlocks';
import { CommunityPostsBlock, ContactDetailsBlock, StatisticsBlock } from './blocks/DataBlocks';

/**
 * Renders one CMS block. Unknown block types render nothing rather than
 * throwing — an admin should never be able to break a live page by leaving
 * behind a block whose component was removed.
 */
function Block({ block, stats }: { block: CmsPageBlock; stats: ImpactStats }) {
  const data = (block.data ?? {}) as BlockData;

  switch (block.block_type) {
    case 'hero':
      return <HeroBlock data={data} />;
    case 'rich_text':
      return <RichTextBlock data={data} />;
    case 'image':
      return <ImageBlock data={data} />;
    case 'image_text':
      return <ImageTextBlock data={data} />;
    case 'hadith':
      return <HadithBlock data={data} />;
    case 'statistics':
      return <StatisticsBlock data={data} stats={stats} />;
    case 'cards':
      return <CardsBlock data={data} />;
    case 'gallery':
      return <GalleryBlock data={data} />;
    case 'video':
      return <VideoBlock data={data} embed={embedUrl(str(data, 'url'))} />;
    case 'faq':
      return <FaqBlock data={data} />;
    case 'cta':
      return <CtaBlock data={data} />;
    case 'community_posts':
      return <CommunityPostsBlock data={data} />;
    case 'contact_details':
      return <ContactDetailsBlock data={data} />;
    case 'social_embed':
      return <SocialEmbedBlock data={data} />;
    case 'custom':
      return <CustomBlock data={data} />;
    default:
      return null;
  }
}

/**
 * Renders an ordered list of CMS blocks. This is the single entry point every
 * public page uses — the homepage has no bespoke markup of its own.
 */
export function BlockRenderer({
  blocks,
  stats,
  showHidden = false,
}: {
  blocks: CmsPageBlock[];
  stats: ImpactStats;
  showHidden?: boolean;
}) {
  const visible = showHidden ? blocks : blocks.filter((b) => b.is_visible);

  return (
    <>
      {visible.map((block) => (
        <div key={block.id} data-block-type={block.block_type} className={block.is_visible ? undefined : 'opacity-50'}>
          <Block block={block} stats={stats} />
        </div>
      ))}
    </>
  );
}
