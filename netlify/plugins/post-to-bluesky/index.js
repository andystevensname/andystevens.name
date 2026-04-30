import { readFile } from 'node:fs/promises';
import { wantsSyndication, BLUESKY_TOKEN } from '../../../src/lib/post-sources.mjs';

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
  // Detect the URL in the text and create a facet for it
  const urlStart = text.indexOf(url);
  const urlEnd = urlStart + new TextEncoder().encode(url).length;

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    facets: [
      {
        index: {
          byteStart: new TextEncoder().encode(text.slice(0, urlStart)).length,
          byteEnd: new TextEncoder().encode(text.slice(0, urlStart)).length + new TextEncoder().encode(url).length,
        },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: url,
          },
        ],
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

export const onSuccess = async function () {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!handle || !password) {
    console.log('BLUESKY_HANDLE or BLUESKY_APP_PASSWORD not set, skipping Bluesky post');
    return;
  }

  let posts;
  try {
    posts = JSON.parse(await readFile('data/posts.json', 'utf8'));
  } catch (e) {
    console.warn('Bluesky: no post manifest found, skipping:', e.message);
    return;
  }

  // "New" = published within the last 10 minutes of this build, matching
  // the prior RSS-based behavior (catches just-deployed content while
  // skipping older posts that happen to opt into Bluesky after the fact).
  const cutoff = Date.now() - 10 * 60 * 1000;
  const candidates = posts.filter((p) => {
    if (p.apType === 'Like') return false;
    if (new Date(p.published).getTime() < cutoff) return false;
    return wantsSyndication(p.syndication, BLUESKY_TOKEN);
  });

  if (candidates.length === 0) {
    console.log('No new items opted into Bluesky syndication');
    return;
  }

  try {
    const session = await createSession(handle, password);
    console.log(`Authenticated as ${session.handle}`);

    for (const post of candidates) {
      const text = post.title ? `${post.title}\n\n${post.url}` : post.url;
      const result = await createPost(session, text, post.url);
      console.log(`Posted to Bluesky: ${post.title || post.url} (${result.uri})`);
    }
  } catch (e) {
    console.warn('Bluesky posting error:', e.message);
  }
};
