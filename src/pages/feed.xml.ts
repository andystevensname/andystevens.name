import type { APIContext } from 'astro';
import { getFeedItems } from '../lib/feeds/load.mjs';
import { renderRss } from '../lib/feeds/renderers/rss.mjs';

export async function GET(context: APIContext) {
  const items = await getFeedItems({ feeds: ['rss'], base: context.site!.href });
  return renderRss(items, { site: context.site!.href });
}
