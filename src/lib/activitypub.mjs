// Builders for the JSON shapes Mastodon expects.
// Keep these pure - they take data, return objects.

const CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://w3id.org/security/v1',
];

export function config() {
  const domain = process.env.AP_DOMAIN;
  const username = process.env.AP_USERNAME;
  if (!domain || !username) {
    throw new Error('AP_DOMAIN and AP_USERNAME env vars are required');
  }
  const base = `https://${domain}`;
  return {
    domain,
    username,
    base,
    actorUrl: `${base}/ap/actor`,
    inboxUrl: `${base}/ap/inbox`,
    outboxUrl: `${base}/ap/outbox`,
    followersUrl: `${base}/ap/followers`,
    keyId: `${base}/ap/actor#main-key`,
    displayName: process.env.AP_DISPLAY_NAME || username,
    summary: process.env.AP_SUMMARY || '',
    iconUrl: process.env.AP_ICON_URL,
    publicKey: process.env.AP_PUBLIC_KEY,
    privateKey: process.env.AP_PRIVATE_KEY,
  };
}

export function buildActor() {
  const c = config();
  return {
    '@context': CONTEXT,
    id: c.actorUrl,
    type: 'Person',
    preferredUsername: c.username,
    name: c.displayName,
    summary: c.summary,
    url: c.base,
    inbox: c.inboxUrl,
    outbox: c.outboxUrl,
    followers: c.followersUrl,
    // Mastodon likes seeing this even if we don't process outgoing follows
    following: `${c.base}/ap/following`,
    icon: c.iconUrl
      ? { type: 'Image', mediaType: 'image/jpeg', url: c.iconUrl }
      : undefined,
    publicKey: {
      id: c.keyId,
      owner: c.actorUrl,
      publicKeyPem: c.publicKey,
    },
    // Mastodon-flavored extras that improve discovery
    manuallyApprovesFollowers: false,
    discoverable: true,
    indexable: true,
  };
}

export function buildWebFinger(resource) {
  const c = config();
  const expected = `acct:${c.username}@${c.domain}`;
  if (resource !== expected) return null;
  return {
    subject: expected,
    aliases: [c.base, c.actorUrl],
    links: [
      { rel: 'self', type: 'application/activity+json', href: c.actorUrl },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: c.base,
      },
    ],
  };
}

/**
 * Build a Note (or Article) for a blog post.
 * @param {object} post - { slug, title, html, published, url }
 */
export function buildNote(post) {
  const c = config();
  const id = `${c.base}/ap/notes/${post.slug}`;
  // Use Note for microblog-style posts, Article for full blog posts.
  // Mastodon renders both; Article gets a "read more" treatment on long content.
  const type = post.title ? 'Article' : 'Note';
  return {
    '@context': CONTEXT,
    id,
    type,
    attributedTo: c.actorUrl,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [c.followersUrl],
    published: post.published,
    url: post.url,
    name: post.title,
    content: post.html,
    mediaType: 'text/html',
    source: post.markdown
      ? { content: post.markdown, mediaType: 'text/markdown' }
      : undefined,
    attachment: [],
    tag: (post.tags || []).map((t) => ({
      type: 'Hashtag',
      name: `#${t}`,
      href: `${c.base}/tags/${t}`,
    })),
  };
}

/**
 * Wrap a Note in a Create activity for delivery.
 */
export function buildCreateActivity(note) {
  const c = config();
  return {
    '@context': CONTEXT,
    id: `${note.id}/activity`,
    type: 'Create',
    actor: c.actorUrl,
    published: note.published,
    to: note.to,
    cc: note.cc,
    object: note,
  };
}

/**
 * Build an Accept response to a Follow request.
 */
export function buildAcceptActivity(followActivity) {
  const c = config();
  return {
    '@context': CONTEXT,
    id: `${c.base}/ap/accepts/${encodeURIComponent(followActivity.id)}`,
    type: 'Accept',
    actor: c.actorUrl,
    object: followActivity,
  };
}
