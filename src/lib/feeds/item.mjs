// Normalize a content entry into the shared FeedItem model.
//
// `raw` is anything shaped like Astro's getCollection() entries:
// { id, data, body }. Renderers read only what they need off the result
// and ignore the rest — the same contract the post manifest gives AP
// and Bluesky.

import { renderBody } from '../render-body.mjs';

export const DEFAULT_BASE = 'https://andystevens.name';

/**
 * @param {{ id: string, data: Record<string, any>, body?: string }} raw
 * @param {Record<string, any>} source Entry from the feed source registry.
 * @param {{ base?: string }} [options]
 * @returns {import('./types').FeedItem}
 */
export function toFeedItem(raw, source, { base = DEFAULT_BASE } = {}) {
  const { id, data, body } = raw;
  const slug = data.slug || id.replace(/\.[^.]+$/, '');
  const date = data.date ? new Date(data.date) : null;

  const item = {
    collection: source.collection,
    slug,
    url: `${base.replace(/\/$/, '')}${source.path}/${slug}/`,
    date: date ? date.toISOString() : null,
    feedType: source.collection.replace(/s$/, ''),
    apType: source.type,
    title: data.title || null,
    summary: data[source.summaryField ?? 'description'] || null,
    markdown: body ?? '',
    bodyHtml: renderBody(body),
    tags: data.tags || [],
    linkTo: source.linkField ? data[source.linkField] || null : null,
    inReplyTo: source.inReplyToField ? data[source.inReplyToField] || null : null,
    likeTarget: source.targetField ? data[source.targetField] || null : null,
    syndication: data.syndication || [],
    notify: data.notify !== false,
    published: data.published !== false,
  };

  if (source.feedImageField) {
    const src = data[source.feedImageField];
    const first = Array.isArray(src) ? src[0] : src;
    if (first) {
      item.image = {
        src: first,
        width: source.feedWidthField ? data[source.feedWidthField] : undefined,
        height: source.feedHeightField ? data[source.feedHeightField] : undefined,
        alt: source.feedAltField ? data[source.feedAltField] || null : null,
      };
    }
  }

  return item;
}

// Newest first; undated items sort last (stable within a date).
/**
 * @template {{ date: string | null }} T
 * @param {T[]} items
 * @returns {T[]}
 */
export function sortFeedItems(items) {
  const time = (item) => (item.date ? new Date(item.date).getTime() : 0);
  return [...items].sort((a, b) => time(b) - time(a));
}
