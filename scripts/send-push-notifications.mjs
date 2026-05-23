// Push fanout, runner-side. Used to be a Netlify Function + Edge Script
// handler; moved here because web-push is Node-heavy and doesn't bundle
// cleanly for Bunny's Deno edge runtime. Runner has full Node, so it
// reads the manifest from disk, talks to libsql directly via storage.mjs,
// and sends pushes natively with web-push — no edge involvement.
//
// Cursor-driven: only sends for posts published after the last cursor.
// On cold start (no cursor yet), anchors at the current max so we don't
// replay the entire archive.

import { configureVapid, sendForPosts } from '../src/lib/push-send.mjs';
import { getLastPushed, setLastPushed } from '../src/lib/storage.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';

function maxByPublished(posts) {
  return posts.reduce(
    (m, p) => {
      const ts = new Date(p.published).getTime();
      return ts > m.ts ? { slug: p.slug, ts, date: p.published } : m;
    },
    { ts: -Infinity, slug: null, date: null }
  );
}

if (!configureVapid()) {
  console.log('VAPID env vars not set, skipping push notifications');
  process.exit(0);
}

let posts;
try {
  posts = await loadManifest();
} catch (e) {
  console.warn('Push fanout: no manifest, skipping:', e.message);
  process.exit(0);
}

const cursor = await getLastPushed();
const now = Date.now();
const eligible = posts.filter((p) => {
  if (p.notify === false) return false;
  const ts = new Date(p.published).getTime();
  return Number.isFinite(ts) && ts <= now;
});

if (!cursor) {
  if (eligible.length === 0) {
    console.log('Push fanout: cold start, no posts');
    process.exit(0);
  }
  const max = maxByPublished(eligible);
  await setLastPushed({ slug: max.slug, date: max.date });
  console.log(`Push fanout: cold-start anchored at ${max.slug} (${max.date})`);
  process.exit(0);
}

const cursorTs = new Date(cursor.date).getTime();
const candidates = eligible.filter(
  (p) => new Date(p.published).getTime() > cursorTs
);

if (candidates.length === 0) {
  console.log('Push fanout: nothing new since cursor');
  process.exit(0);
}

const result = await sendForPosts(candidates);

// Advance cursor regardless of send outcome — transient failures become
// miss-once; persistent failures would otherwise replay forever.
const max = maxByPublished(candidates);
await setLastPushed({ slug: max.slug, date: max.date });

console.log(
  `Push fanout: sent=${result.sent ?? 0} pruned=${result.pruned ?? 0} candidates=${candidates.length} cursor=${max.slug}`
);
