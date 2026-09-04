import type { APIContext } from 'astro';
import { getFeedItems } from '../lib/feeds/load';
import { renderJsonFeed } from '../lib/feeds/renderers/json-feed';

export async function GET(context: APIContext) {
  const items = await getFeedItems({ feeds: ['json'], base: context.site!.href });
  const feed = renderJsonFeed(items, { site: context.site!.href });
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
