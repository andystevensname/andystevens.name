// Feed source registry: extends the ActivityPub sources in
// ../post-sources.mjs with feed-specific concerns. Each feed renderer
// filters this list by its own feed key to decide which collections it
// includes — the same "one registry, many consumers" shape as the
// syndication system.
//
// The AP fields (type, summaryField, linkField, targetField,
// inReplyToField, imageField) stay in post-sources.mjs and are
// untouched here. Keys added by this module:
//
//   label          — human-facing collection name ("Articles")
//   feeds          — which feeds the collection appears in
//   feedImageField — frontmatter field holding the cover/photo
//   feedAltField   — alt text field
//   feedWidthField / feedHeightField — dimensions (aspect-ratio hints)
//
// `code` is not federated (no AP type) but participates in feeds, so it
// is added here rather than in post-sources.mjs.

import { sources as apSources } from '../post-sources.mjs';

// Canonical feed keys. 'html' is the site itself (pages already exist;
// the key documents membership for future refactors of FeedItem.astro).
export const FEEDS = ['html', 'rss', 'json', 'gemini', 'gopher', 'markdown'];

// Collections excluded from specific feeds. Everything else appears in
// every feed. Photos/likes have no prose body worth rendering as
// gemtext/gopher; albums are containers, not feed posts; code isn't in
// the post manifest, so the generator can't publish its source files.
const EXCLUDED = {
  photos: ['gemini', 'gopher'],
  likes: ['gemini', 'gopher'],
  albums: ['rss', 'json'],
  code: ['gemini', 'gopher', 'markdown'],
};

const EXTENSIONS = {
  photos: {
    feedImageField: 'photo',
    feedAltField: 'alt',
    feedWidthField: 'width',
    feedHeightField: 'height',
  },
  albums: {
    feedImageField: 'cover',
  },
};

const EXTRA_SOURCES = [
  { collection: 'code', path: '/code' },
];

export const feedSources = [...apSources, ...EXTRA_SOURCES].map((source) => ({
  ...source,
  label: source.collection.charAt(0).toUpperCase() + source.collection.slice(1),
  feeds: FEEDS.filter((f) => !(EXCLUDED[source.collection] || []).includes(f)),
  ...(EXTENSIONS[source.collection] || {}),
}));

// The collections a given set of feeds cares about.
export function sourcesForFeeds(feeds) {
  return feedSources.filter((s) => s.feeds.some((f) => feeds.includes(f)));
}
