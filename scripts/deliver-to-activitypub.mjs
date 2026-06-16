import { federatable, ACTIVITYPUB_TOKEN } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { selectUnsyndicated, recordSyndicated, postId } from '../src/lib/syndicate.mjs';

const deliverSecret = process.env.AP_DELIVER_SECRET;
const domain = process.env.AP_DOMAIN;

if (!deliverSecret || !domain) {
  console.log('AP_DELIVER_SECRET or AP_DOMAIN not set, skipping ActivityPub delivery');
  process.exit(0);
}

// The ledger lives in the Bunny state bucket. Without it there's no dedup, so
// SKIP rather than deliver blind (delivering without the ledger risks dupes).
if (!process.env.BUNNY_STATE_BUCKET_NAME || !process.env.BUNNY_STATE_ACCESS_KEY) {
  console.log('BUNNY_STATE_BUCKET_NAME/ACCESS_KEY not set, skipping ActivityPub (ledger unavailable)');
  process.exit(0);
}

let posts;
try {
  posts = await loadManifest();
} catch (e) {
  console.warn('ActivityPub: no post manifest found, skipping:', e.message);
  process.exit(0);
}

// Ledger-based dedup: deliver opted-in posts not already recorded for
// ActivityPub, then record the ones that succeed. (See src/lib/syndicate.mjs.)
const { candidates, seedIds } = await selectUnsyndicated(
  posts,
  ACTIVITYPUB_TOKEN,
  federatable
);

// Cold start: seal the existing back-catalogue into the ledger up front so a
// mid-run failure can't replay it on the next deploy.
if (seedIds) {
  await recordSyndicated(ACTIVITYPUB_TOKEN, seedIds);
  console.log(`ActivityPub: cold start — sealed ${seedIds.length} existing post(s) into the ledger`);
}

if (candidates.length === 0) {
  console.log('No new items opted into ActivityPub syndication');
  process.exit(0);
}

const deliverUrl = `https://${domain}/api/deliver`;

const sent = [];
for (const post of candidates) {
  try {
    const res = await fetch(deliverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliverSecret}`,
      },
      body: JSON.stringify({ slug: post.slug, collection: post.collection }),
    });

    const result = await res.json().catch(() => ({}));

    if (res.ok) {
      sent.push(postId(post));
      console.log(
        `ActivityPub: delivered ${post.collection}/${post.slug} (${result.delivered}/${result.total} inboxes)`
      );
    } else {
      // Leave failures OUT of the ledger so they retry next deploy.
      console.warn(
        `ActivityPub: delivery failed for ${post.collection}/${post.slug}: ${res.status}`,
        result.error || ''
      );
    }
  } catch (e) {
    console.warn(`ActivityPub: delivery error for ${post.collection}/${post.slug}:`, e.message);
  }
}

// On a normal run record only what actually delivered; on cold start the seal
// above already covered everything.
if (!seedIds) await recordSyndicated(ACTIVITYPUB_TOKEN, sent);
