import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import Parser from 'rss-parser';
import { wantsSyndication, BLUESKY_TOKEN } from '../../../src/lib/ap-sources.mjs';

const BLUESKY_SERVICE = 'https://bsky.social';

// Map a public post URL (e.g. https://site/notes/helloactivitypub/) back to
// its source markdown path (src/content/notes/helloactivitypub.md). The
// site URL structure mirrors src/content/<collection>/<slug>, so the first
// two path segments are all we need.
function sourcePathForUrl(url) {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    const [collection, slug] = parts;
    return `src/content/${collection}/${slug}.md`;
  } catch {
    return null;
  }
}

// Read the YAML frontmatter from a markdown file and return its parsed object,
// or null if the file is missing or the frontmatter block can't be located.
async function readFrontmatter(path) {
  try {
    const text = await readFile(path, 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

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

  try {
    // Parse the site's RSS feed. rss-parser handles fetch + entity
    // decoding + CDATA + namespace prefixes + the various RSS quirks
    // that a regex extractor silently gets wrong.
    const parser = new Parser();
    const feed = await parser.parseURL('https://andystevens.name/feed.xml');
    const items = feed.items.map((i) => ({
      title: i.title || '',
      link: i.link || '',
      pubDate: new Date(i.pubDate || i.isoDate || 0),
    }));

    if (items.length === 0) {
      console.log('No items in RSS feed');
      return;
    }

    // Only post items from the last 10 minutes (to catch just-deployed content)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentItems = items.filter(item => item.pubDate > tenMinutesAgo);

    if (recentItems.length === 0) {
      console.log('No new items to post to Bluesky');
      return;
    }

    // Gate on each item's `syndication` frontmatter. Posts opt in via
    // `syndication: [bluesky]` (or `[all]`); anything else is skipped.
    const newItems = [];
    for (const item of recentItems) {
      const sourcePath = sourcePathForUrl(item.link);
      if (!sourcePath) {
        console.log(`Skipping ${item.link}: could not resolve source path`);
        continue;
      }
      const frontmatter = await readFrontmatter(sourcePath);
      if (!wantsSyndication(frontmatter?.syndication, BLUESKY_TOKEN)) {
        console.log(`Skipping ${item.link}: no Bluesky syndication intent`);
        continue;
      }
      newItems.push(item);
    }

    if (newItems.length === 0) {
      console.log('No new items opted into Bluesky syndication');
      return;
    }

    const session = await createSession(handle, password);
    console.log(`Authenticated as ${session.handle}`);

    for (const item of newItems) {
      const text = item.title
        ? `${item.title}\n\n${item.link}`
        : item.link;

      const result = await createPost(session, text, item.link);
      console.log(`Posted to Bluesky: ${item.title || item.link} (${result.uri})`);
    }
  } catch (e) {
    console.warn('Bluesky posting error:', e.message);
  }
};
