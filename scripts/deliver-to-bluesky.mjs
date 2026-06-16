import { wantsSyndication, BLUESKY_TOKEN } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { selectUnsyndicated, recordSyndicated, postId } from '../src/lib/syndicate.mjs';

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

let posts;
try {
  posts = await loadManifest();
} catch (e) {
  console.warn('Bluesky: no post manifest found, skipping:', e.message);
  process.exit(0);
}

// Ledger-based dedup: syndicate opted-in posts not already recorded for
// Bluesky, then record the ones that succeed. (See src/lib/syndicate.mjs.)
const { candidates, seedIds } = await selectUnsyndicated(
  posts,
  BLUESKY_TOKEN,
  (p) => wantsSyndication(p.syndication, BLUESKY_TOKEN)
);

// Cold start: seal the existing back-catalogue into the ledger up front so a
// mid-run failure can't replay it on the next deploy.
if (seedIds) {
  await recordSyndicated(BLUESKY_TOKEN, seedIds);
  console.log(`Bluesky: cold start — sealed ${seedIds.length} existing post(s) into the ledger`);
}

if (candidates.length === 0) {
  console.log('No new items opted into Bluesky syndication');
  process.exit(0);
}

try {
  const session = await createSession(handle, password);
  console.log(`Authenticated as ${session.handle}`);

  const sent = [];
  for (const post of candidates) {
    let text, linkUrl;
    if (post.apType === 'Like') {
      text = `Liked: ${post.likeTarget}`;
      linkUrl = post.likeTarget;
    } else {
      text = post.title ? `${post.title}\n\n${post.url}` : post.url;
      linkUrl = post.url;
    }
    try {
      const result = await createPost(session, text, linkUrl);
      sent.push(postId(post));
      console.log(`Posted to Bluesky: ${post.title || post.url} (${result.uri})`);
    } catch (e) {
      // Per-post failure: leave it OUT of the ledger so it retries next deploy.
      console.warn(`Bluesky: post failed for ${post.url}, will retry next deploy:`, e.message);
    }
  }

  // On a normal run record only what actually sent; on cold start the seal
  // above already covered everything.
  if (!seedIds) await recordSyndicated(BLUESKY_TOKEN, sent);
} catch (e) {
  console.warn('Bluesky posting error:', e.message);
}
