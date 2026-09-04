// Astro-side feed loader: walks the collections the requested feeds
// care about and returns normalized, sorted FeedItems.
//
// Page endpoints (feed.xml.ts, feed.json.ts, and eventually the HTML
// pages) use this. Node build scripts that run outside Astro instead
// read the build-time manifest — same FeedItem model, different loader.

import { getCollection } from 'astro:content';
import { sourcesForFeeds } from './sources.mjs';
import { toFeedItem, sortFeedItems } from './item.mjs';

/**
 * @param {object} [options]
 * @param {string[]} [options.feeds] Feed keys; collections are those the
 *   registry says belong to any of them.
 * @param {string} [options.base] Absolute site origin for item URLs.
 *   Defaults to DEFAULT_BASE in item.mjs.
 * @param {boolean} [options.includeUnpublished]
 * @returns {Promise<import('./types').FeedItem[]>}
 */
export async function getFeedItems({ feeds = ['rss'], base, includeUnpublished = false } = {}) {
  const sources = sourcesForFeeds(feeds);
  const collections = await Promise.all(
    sources.map((source) =>
      getCollection(
        source.collection,
        includeUnpublished ? undefined : ({ data }) => data.published !== false
      )
    )
  );
  const items = [];
  for (let i = 0; i < sources.length; i++) {
    for (const entry of collections[i]) {
      items.push(toFeedItem(entry, sources[i], { base }));
    }
  }
  return sortFeedItems(items);
}
