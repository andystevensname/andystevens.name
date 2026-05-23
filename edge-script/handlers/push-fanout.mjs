// Cursor-driven push fanout. Triggered by the send-push-notifications
// build plugin after a successful deploy; runs in function context so
// it has Netlify Blobs access (build plugins don't get it automatically).
//
// Auth: shared secret in Authorization header, matching PUSH_FANOUT_SECRET.

import { configureVapid, sendForPosts } from '../../src/lib/push-send.mjs';
import { getLastPushed, setLastPushed } from '../../src/lib/storage.mjs';
import { loadManifest } from '../../src/lib/manifest.mjs';

function maxByPublished(posts) {
  return posts.reduce((m, p) => {
    const ts = new Date(p.published).getTime();
    return ts > m.ts ? { slug: p.slug, ts, date: p.published } : m;
  }, { ts: -Infinity, slug: null, date: null });
}

export default async (request) => {
  const auth = request.headers.get('authorization');
  const secret = process.env.PUSH_FANOUT_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }

  if (!configureVapid()) {
    return new Response('VAPID env vars not set', { status: 500 });
  }

  let posts;
  try {
    posts = await loadManifest();
  } catch (e) {
    return new Response(`no manifest: ${e.message}`, { status: 500 });
  }

  const cursor = await getLastPushed();
  const now = Date.now();
  const eligible = posts.filter((p) => {
    if (p.notify === false) return false;
    const ts = new Date(p.published).getTime();
    return Number.isFinite(ts) && ts <= now;
  });

  // Cold start: anchor the cursor at the current max so we don't replay
  // the entire archive on the first deploy after enabling.
  if (!cursor) {
    if (eligible.length === 0) {
      return Response.json({ skipped: 'cold-start-no-posts' });
    }
    const max = maxByPublished(eligible);
    await setLastPushed({ slug: max.slug, date: max.date });
    return Response.json({ skipped: 'cold-start', cursor: max });
  }

  const cursorTs = new Date(cursor.date).getTime();
  const candidates = eligible.filter((p) => new Date(p.published).getTime() > cursorTs);

  if (candidates.length === 0) {
    return Response.json({ skipped: 'no-new' });
  }

  const result = await sendForPosts(candidates);

  // Advance the cursor regardless of send outcome — transient failures
  // become miss-once; persistent failures (bad VAPID, etc.) would
  // otherwise replay forever.
  const max = maxByPublished(candidates);
  await setLastPushed({ slug: max.slug, date: max.date });

  return Response.json({ ...result, candidates: candidates.length, cursor: max });
};
