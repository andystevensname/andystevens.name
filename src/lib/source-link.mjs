// Helper for rendering the <link rel="alternate" type="text/markdown">
// tag on post pages. Advertise the raw markdown source file that
// scripts/generate-feeds.mjs publishes next to each post URL
// (/{collection}/{slug}.md) so crawlers and mirrors can find it.
//
// Returns an empty string for collections that have no published source
// file (e.g. code, which the post manifest — and therefore the
// generator — doesn't carry), which makes it safe to pass
// unconditionally into Layout.extraHead. Mirrors the contract of
// ap-link.mjs.

import { sourcesForFeeds } from './feeds/sources.mjs';

export function markdownSourceLink(collection, entry, site) {
  const source = sourcesForFeeds(['markdown']).find(
    (s) => s.collection === collection
  );
  if (!source) return '';
  if (entry.data.published === false) return '';
  const slug = entry.data.slug || entry.id.replace(/\.[^.]+$/, '');
  const href = new URL(`${source.path}/${slug}.md`, site).href;
  return `<link rel="alternate" type="text/markdown" href="${href}" title="Markdown source">`;
}
