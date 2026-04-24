// Builders for the JSON shapes Mastodon expects. Multi-collection aware.

const CONTEXT = [
  'https://www.w3.org/ns/activitystreams',
  'https://w3id.org/security/v1',
];

// PEM keys pasted into Netlify's env-var UI commonly arrive with literal
// "\n" sequences instead of real newlines, or with leading whitespace on
// each line. Both break `createSign`/`createVerify` silently — signatures
// are produced but fail to verify remotely. Normalize once, here.
function normalizePem(pem) {
  if (!pem) return pem;
  return pem
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => line || (i > 0 && i < arr.length - 1))
    .join('\n');
}

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
    publicKey: normalizePem(process.env.AP_PUBLIC_KEY),
    privateKey: normalizePem(process.env.AP_PRIVATE_KEY),
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
    following: `${c.base}/ap/following`,
    icon: c.iconUrl
      ? { type: 'Image', mediaType: 'image/jpeg', url: c.iconUrl }
      : undefined,
    publicKey: {
      id: c.keyId,
      owner: c.actorUrl,
      publicKeyPem: c.publicKey,
    },
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

// The AP object id points at /ap/objects/:collection/:slug — a Netlify
// function that returns AP JSON. The web URL points at the HTML page. They
// must be distinct because static HTML can't do content negotiation.
export function buildFromManifestItem(item) {
  const c = config();

  if (item.apType === 'Like') {
    return { object: null, activity: null, likeTarget: item.likeTarget };
  }

  const objectId = `${c.base}/ap/objects/${item.collection}/${item.slug}`;

  const object = {
    '@context': CONTEXT,
    id: objectId,
    type: item.apType,
    attributedTo: c.actorUrl,
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    cc: [c.followersUrl],
    published: item.published,
    url: item.url,
    content: buildContent(item),
    mediaType: 'text/html',
    attachment: buildAttachments(item),
    tag: buildTags(item, c),
  };

  if (item.title) object.name = item.title;
  if (item.summary) object.summary = item.summary;
  if (item.markdown) {
    object.source = { content: item.markdown, mediaType: 'text/markdown' };
  }
  if (item.inReplyTo) object.inReplyTo = item.inReplyTo;

  const activity = {
    '@context': CONTEXT,
    id: `${objectId}/activity`,
    type: 'Create',
    actor: c.actorUrl,
    published: item.published,
    to: object.to,
    cc: object.cc,
    object,
  };

  return { object, activity };
}

export function buildLikeActivity(item, targetId) {
  const c = config();
  return {
    '@context': CONTEXT,
    id: `${c.base}/ap/objects/likes/${item.slug}/activity`,
    type: 'Like',
    actor: c.actorUrl,
    object: targetId,
    published: item.published,
  };
}

function buildContent(item) {
  // For items with an external link (bookmarks, writing), append it to the
  // rendered body unless it's already in there.
  if (item.externalLink && !(item.html || '').includes(item.externalLink)) {
    const linkHtml = `<p><a href="${escapeHtml(item.externalLink)}">${escapeHtml(item.externalLink)}</a></p>`;
    return (item.html || '') + linkHtml;
  }
  return item.html || '';
}

function buildAttachments(item) {
  if (!item.images || !item.images.length) return [];
  const c = config();
  return item.images.map((img) => {
    const url = img.startsWith('http') ? img : `${c.base}${img}`;
    return {
      type: 'Image',
      mediaType: guessMediaType(url),
      url,
      // Mastodon uses `name` as alt text.
      name: item.summary || item.title || '',
    };
  });
}

function buildTags(item, c) {
  return (item.tags || []).map((t) => ({
    type: 'Hashtag',
    name: `#${t}`,
    href: `${c.base}/tags/${t}`,
  }));
}

function guessMediaType(url) {
  const ext = url.toLowerCase().split('.').pop();
  return (
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
    }[ext] || 'image/jpeg'
  );
}

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
