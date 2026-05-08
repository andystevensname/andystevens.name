import { readFile } from 'node:fs/promises';
import { configureVapid, sendForPosts } from '../../../src/lib/push-send.mjs';

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

  // "New" = published within the last hour. Same window as the Bluesky
  // plugin so behavior stays consistent across syndication channels.
  // Per-post opt-out via `notify: false` in frontmatter.
  const cutoff = Date.now() - 60 * 60 * 1000;
  const candidates = posts.filter((p) => {
    if (p.notify === false) return false;
    return new Date(p.published).getTime() >= cutoff;
  });

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
  console.log(`Push: sent ${result.sent}, pruned ${result.pruned} dead subscription(s) across ${result.posts ?? 0} post(s)`);
};
