// Node-side feed loader: converts the build-time post manifest
// (data/posts.json) into the shared FeedItem model.
//
// This is the script-side twin of load.mjs: Astro page endpoints call
// getCollection() directly, while build scripts (generate-feeds.mjs)
// read the manifest the build already produced — the same contract as
// the syndication runners. No markdown re-parsing needed.

import { sourcesForFeeds } from './sources.mjs';
import { sortFeedItems } from './item.mjs';

function toFeedItemFromManifest(item) {
  const feedItem = {
    collection: item.collection,
    slug: item.slug,
    url: item.url,
    date: item.published || null,
    feedType: item.collection.replace(/s$/, ''),
    apType: item.apType,
    title: item.title || null,
    summary: item.summary || null,
    markdown: item.markdown || '',
    bodyHtml: item.html || undefined,
    tags: item.tags || [],
    linkTo: item.externalLink || null,
    inReplyTo: item.inReplyTo || null,
    likeTarget: item.likeTarget || null,
    syndication: item.syndication || [],
    notify: item.notify !== false,
    published: true, // the manifest only ever contains published posts
  };
  if (Array.isArray(item.images) && item.images.length) {
    feedItem.image = { src: item.images[0] };
  }
  return feedItem;
}

// Filter the manifest down to the collections `feeds` care about,
// normalize, and sort newest-first.
export function feedItemsFromManifest(manifest, { feeds } = {}) {
  if (!feeds) throw new Error('feedItemsFromManifest: { feeds } is required');
  const wanted = new Set(sourcesForFeeds(feeds).map((s) => s.collection));
  return sortFeedItems(
    manifest.filter((item) => wanted.has(item.collection)).map(toFeedItemFromManifest)
  );
}
