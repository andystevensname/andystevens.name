import { wantsSyndication, BLUESKY_TOKEN } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { runSyndication, ledgerConfigured } from '../src/lib/syndicate.mjs';

const BLUESKY_SERVICE = 'https://bsky.social';

async function createSession(identifier, password) {
  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    throw new Error(`Bluesky auth failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function createPost(session, text, url) {
  const enc = new TextEncoder();
  const byteStart = enc.encode(text.slice(0, text.indexOf(url))).length;
  const byteEnd = byteStart + enc.encode(url).length;

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    facets: [
      {
        index: { byteStart, byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
      },
    ],
  };

  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  });

  if (!res.ok) {
    throw new Error(`Bluesky post failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const handle = process.env.BLUESKY_HANDLE;
const password = process.env.BLUESKY_APP_PASSWORD;

if (!handle || !password) {
  console.log('BLUESKY_HANDLE or BLUESKY_APP_PASSWORD not set, skipping Bluesky post');
  process.exit(0);
}

if (!ledgerConfigured()) {
  console.log('BUNNY_STATE_BUCKET_NAME/ACCESS_KEY not set, skipping Bluesky (ledger unavailable)');
  process.exit(0);
}

let posts;
try {
  posts = await loadManifest();
} catch (e) {
  console.warn('Bluesky: no post manifest found, skipping:', e.message);
  process.exit(0);
}

await runSyndication({
  target: BLUESKY_TOKEN,
  label: 'Bluesky',
  posts,
  wants: (p) => wantsSyndication(p.syndication, BLUESKY_TOKEN),
  // Authenticate once, and only if there's something to post.
  setup: async () => {
    const session = await createSession(handle, password);
    console.log(`Authenticated as ${session.handle}`);
    return session;
  },
  send: async (post, session) => {
    let text, linkUrl;
    if (post.apType === 'Like') {
      text = `Liked: ${post.likeTarget}`;
      linkUrl = post.likeTarget;
    } else {
      text = post.title ? `${post.title}\n\n${post.url}` : post.url;
      linkUrl = post.url;
    }
    const result = await createPost(session, text, linkUrl);
    console.log(`Posted to Bluesky: ${post.title || post.url} (${result.uri})`);
    return true; // createPost throws on failure, so reaching here means it landed
  },
});
