// Maintenance: drop an entry from a syndication ledger so the post
// re-delivers on the next deploy. Needs the BUNNY_STATE_* env vars set
// (same ones the delivery scripts use).
//
//   node scripts/reset-syndication-ledger.mjs <target> <post-url>
//   node scripts/reset-syndication-ledger.mjs activitypub https://andystevens.name/articles/restoring-onscreen-ipad-keyboard
//
// <target> is the ledger file name: "activitypub" or "bluesky".
// Use it after fixing a delivery bug that recorded a post as "done" before it
// actually landed (e.g. a 0/total AP delivery, or a same-host object-id fix).

import { removeSyndicatedId, getSyndicatedIds } from '../src/lib/storage.mjs';

const [target, url] = process.argv.slice(2);

if (!target || !url) {
  console.error('usage: node scripts/reset-syndication-ledger.mjs <target> <post-url>');
  process.exit(1);
}

if (!process.env.BUNNY_STATE_BUCKET_NAME || !process.env.BUNNY_STATE_ACCESS_KEY) {
  console.error('BUNNY_STATE_BUCKET_NAME and BUNNY_STATE_ACCESS_KEY must be set');
  process.exit(1);
}

const removed = await removeSyndicatedId(target, url);
if (removed) {
  console.log(`Removed from ${target} ledger: ${url}`);
  console.log(`It will re-deliver on the next deploy. Remaining: ${(await getSyndicatedIds(target)).size} id(s).`);
} else {
  console.log(`Not in ${target} ledger (nothing to do): ${url}`);
}
