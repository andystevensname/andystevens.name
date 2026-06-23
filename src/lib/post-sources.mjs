// Post manifest sources: each entry maps a content collection to the
// fields the build-time manifest needs to record. The manifest at
// data/posts.json is the single source of truth for "what got published
// in this build" — every syndication target reads it.
//
// Opt-in is per-post via the `syndication` frontmatter array (IndieWeb
// POSSE convention). The manifest itself doesn't filter by token; each
// consumer decides what tokens it cares about.
//
// The `type`, `targetField`, `imageField`, `linkField`, and
// `inReplyToField` keys are AP-specific and describe how a collection
// would map to ActivityPub. Other syndication targets (e.g. Bluesky)
// don't need them — they read flat fields off the manifest entry.
//
// Used by:
//   - src/pages/post-manifest.json.ts (generates the manifest at build time)
//   - src/lib/ap-link.mjs             (decides whether to render the AP <link>)
//   - netlify/functions/*.mjs         (AP runtime — filter via `federatable`)
//   - netlify/plugins/post-to-bluesky (filters via BLUESKY_TOKEN)

export const ACTIVITYPUB_TOKEN = 'activitypub';
export const BLUESKY_TOKEN = 'bluesky';
// `all` is a wildcard token: any post tagged with it should syndicate to
// every platform, equivalent to listing each individual token.
export const ALL_TOKEN = 'all';

// Returns true if `frontmatterArray` opts the post into syndication for
// `targetToken`. Accepts either an explicit token match or the `all` wildcard.
// Use this from any gate that decides whether to syndicate a post.
export function wantsSyndication(frontmatterArray, targetToken) {
  if (!Array.isArray(frontmatterArray)) return false;
  return frontmatterArray.includes(targetToken) || frontmatterArray.includes(ALL_TOKEN);
}

// Convenience predicate for AP-side code that wants to filter the manifest
// down to federatable items. Saves every call site repeating the token.
export const federatable = (post) =>
  wantsSyndication(post.syndication, ACTIVITYPUB_TOKEN);

// AP object `type` per collection. Use `Note` for everything that should show
// up as a normal post on Mastodon. Mastodon only natively renders `Note`
// (and `Question`); `Article` is a "converted" type whose handling is lossy
// and version-dependent — it frequently federates as "delivered but no visible
// status". So long-form posts are emitted as `Note` too (the content is the
// same HTML either way; only the wrapper type changes).
export const sources = [
  { collection: 'articles', path: '/articles', type: 'Note' },
  { collection: 'notes',    path: '/notes',    type: 'Note' },
  {
    collection: 'photos',
    path: '/photos',
    type: 'Note',
    imageField: 'photo',
    // `alt` on photos is alt text; becomes the `name` on the AP attachment
    // (which is how Mastodon surfaces alt text to readers).
    summaryField: 'alt',
  },
  {
    collection: 'bookmarks',
    path: '/bookmarks',
    type: 'Note',
    linkField: 'bookmark_of',
  },
  {
    collection: 'replies',
    path: '/replies',
    type: 'Note',
    inReplyToField: 'in_reply_to',
  },
  {
    collection: 'likes',
    path: '/likes',
    type: 'Like',
    targetField: 'like_of',
  },
  {
    collection: 'writing',
    path: '/writing',
    type: 'Note',
    // Appends the external venue URL to the federated content.
    linkField: 'url',
  },
  { collection: 'awards', path: '/awards', type: 'Note' },
  { collection: 'albums', path: '/albums', type: 'Note' },
];
