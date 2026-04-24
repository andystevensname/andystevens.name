// ActivityPub federation sources: each entry maps a content collection to
// an AP object type and the field names in that collection's frontmatter.
//
// Opt-in is per-post via `syndication: ['activitypub']` (IndieWeb POSSE
// convention, matching the Bluesky plugin's gate).
//
// Used by:
//   - src/pages/ap-manifest.json.ts  (generates the manifest at build time)
//   - any future federation tooling that wants to know what's federatable

export const SYNDICATION_TOKEN = 'activitypub';

export const sources = [
  { collection: 'articles', path: '/articles', type: 'Article' },
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
    type: 'Article',
    // Appends the external venue URL to the federated content.
    linkField: 'url',
  },
  { collection: 'awards', path: '/awards', type: 'Article' },
  { collection: 'albums', path: '/albums', type: 'Article' },
];
