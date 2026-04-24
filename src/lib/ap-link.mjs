// Helper for rendering the <link rel="alternate" type="application/activity+json">
// tag on a post page. Advertises the post's ActivityPub object URL so fediverse
// clients that paste the web URL into their search box can resolve it to the
// federated object — matches what Mastodon uses for URL-based lookup.
//
// Returns an empty string when the post shouldn't federate (not in the
// federation sources, unpublished, or missing the 'activitypub' syndication
// token), which makes it safe to pass unconditionally into Layout.extraHead.

import { sources, SYNDICATION_TOKEN } from './ap-sources.mjs';

export function apAlternateLink(collection, entry, site) {
  const source = sources.find((s) => s.collection === collection);
  if (!source) return '';
  if (entry.data.published === false) return '';
  const syndication = entry.data.syndication;
  if (!Array.isArray(syndication) || !syndication.includes(SYNDICATION_TOKEN)) {
    return '';
  }
  const slug = entry.data.slug || entry.id.replace(/\.[^.]+$/, '');
  const href = new URL(`/ap/objects/${collection}/${slug}`, site).href;
  return `<link rel="alternate" type="application/activity+json" href="${href}">`;
}
