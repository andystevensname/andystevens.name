// One-off migration: copies followers, activities, push subscriptions,
// and the push cursor from Netlify Blobs into the Bunny Edge DB Lite
// instance. Idempotent — re-runs overwrite same keys with same data.
//
// Use case: DNS is flipped from Netlify to Bunny. Existing followers
// and push subscribers live in Netlify Blobs and would otherwise be
// silently lost. Run this once (ideally pre-flip; we can still catch
// any new ones if run after).
//
// Required env (set when invoking locally):
//   NETLIFY_AUTH_TOKEN          — Netlify personal access token
//   NETLIFY_SITE_ID             — UUID of the Netlify site (same value
//                                 already used by the deploy step)
//   BUNNY_DATABASE_URL          — libSQL URL for the target DB
//   BUNNY_DATABASE_WRITE_TOKEN  — full-access token
//
// Run:
//   node scripts/migrate-from-netlify.mjs

import { getStore } from '@netlify/blobs';
import {
  addFollower,
  recordActivity,
  addPushSubscription,
  setLastPushed,
} from '../src/lib/storage.mjs';

const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

if (!NETLIFY_AUTH_TOKEN || !NETLIFY_SITE_ID) {
  console.error('NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set');
  process.exit(1);
}

function openStore(name) {
  return getStore({
    name,
    siteID: NETLIFY_SITE_ID,
    token: NETLIFY_AUTH_TOKEN,
  });
}

async function copyJsonStore(name, onEach) {
  const store = openStore(name);
  let count = 0;
  let cursor;
  do {
    const page = await store.list({ cursor });
    for (const blob of page.blobs ?? []) {
      const value = await store.get(blob.key, { type: 'json' });
      if (value == null) continue;
      try {
        await onEach(value, blob.key);
        count++;
      } catch (err) {
        console.warn(`  ${name}/${blob.key}: ${err.message}`);
      }
    }
    cursor = page.cursor;
  } while (cursor);
  return count;
}

console.log('Followers …');
const followers = await copyJsonStore('activitypub-followers', async (v) => {
  if (!v.actor || !v.inbox) throw new Error('missing actor/inbox');
  await addFollower(v.actor, v.inbox, v.sharedInbox);
});
console.log(`  copied ${followers}`);

console.log('Activities …');
const activities = await copyJsonStore('activitypub-activities', async (v) => {
  const id = v.id ?? v['@id'];
  if (!id) throw new Error('missing id');
  await recordActivity(id, v);
});
console.log(`  copied ${activities}`);

console.log('Push subscriptions …');
const subs = await copyJsonStore('push-subscriptions', async (v) => {
  if (!v.endpoint || !v.keys) throw new Error('missing endpoint/keys');
  await addPushSubscription({ endpoint: v.endpoint, keys: v.keys }, v.ua);
});
console.log(`  copied ${subs}`);

console.log('Push cursor …');
const metaStore = openStore('push-meta');
const cursorVal = await metaStore.get('last-pushed', { type: 'json' });
if (cursorVal) {
  await setLastPushed(cursorVal);
  console.log(`  copied last-pushed: ${cursorVal.slug} (${cursorVal.date})`);
} else {
  console.log('  no cursor to migrate');
}

console.log('Migration complete.');
