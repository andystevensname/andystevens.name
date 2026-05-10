import { readFile } from 'node:fs/promises';
import { configureVapid, sendForPosts } from '../../../src/lib/push-send.mjs';
import { getLastPushed, setLastPushed } from '../../../src/lib/storage.mjs';

// "New" = published since the last successful push (cursor in
// push-meta/last-pushed), `notify !== false`, and not future-dated.
// Cursor approach replaces the previous time-window filter, which was
// fragile around the 60-min boundary when build queue + Lighthouse +
// plugin runtime pushed past an hour.

function maxByPublished(posts) {
  return posts.reduce((m, p) => {
    const ts = new Date(p.published).getTime();
    return ts > m.ts ? { slug: p.slug, ts, date: p.published } : m;
  }, { ts: -Infinity, slug: null, date: null });
}

export const onSuccess = async function () {
  if (!configureVapid()) {
    console.log('VAPID env vars not set, skipping push notifications');
    return;
  }

  let posts;
  try {
    posts = JSON.parse(await readFile('data/posts.json', 'utf8'));
  } catch (e) {
    console.warn('Push: no post manifest found, skipping:', e.message);
    return;
  }

  let cursor;
  try {
    cursor = await getLastPushed();
  } catch (e) {
    if (e?.name === 'MissingBlobsEnvironmentError' || /Blobs/.test(e?.message || '')) {
      console.log('Push: Blobs not configured (likely a local build), skipping');
      return;
    }
    throw e;
  }

  const now = Date.now();
  const eligible = posts.filter((p) => {
    if (p.notify === false) return false;
    const ts = new Date(p.published).getTime();
    return Number.isFinite(ts) && ts <= now;
  });

  // Cold start: anchor the cursor to the current max so we don't replay
  // the entire archive on the first deploy after enabling the plugin.
  if (!cursor) {
    if (eligible.length === 0) {
      console.log('Push: cold start, no eligible posts; nothing to anchor');
      return;
    }
    const max = maxByPublished(eligible);
    await setLastPushed({ slug: max.slug, date: max.date });
    console.log(`Push: cold start, cursor initialized at ${max.date}`);
    return;
  }

  const cursorTs = new Date(cursor.date).getTime();
  const candidates = eligible.filter((p) => new Date(p.published).getTime() > cursorTs);

  if (candidates.length === 0) {
    console.log('No new items to notify subscribers about');
    return;
  }

  let result;
  try {
    result = await sendForPosts(candidates);
  } catch (e) {
    if (e?.name === 'MissingBlobsEnvironmentError' || /Blobs/.test(e?.message || '')) {
      console.log('Push: Blobs not configured (likely a local build), skipping');
      return;
    }
    throw e;
  }

  // Advance the cursor regardless of send outcome. Transient failures
  // become miss-once; persistent ones (bad VAPID, etc.) would otherwise
  // keep replaying and amplify the problem.
  const max = maxByPublished(candidates);
  await setLastPushed({ slug: max.slug, date: max.date });

  console.log(`Push: sent ${result.sent}, pruned ${result.pruned}; ${candidates.length} candidate post(s); cursor → ${max.date}`);
};
