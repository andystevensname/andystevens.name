import { federatable, ACTIVITYPUB_TOKEN } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { selectUnsyndicated, recordSyndicated, postId } from '../src/lib/syndicate.mjs';

const deliverSecret = process.env.AP_DELIVER_SECRET;
const domain = process.env.AP_DOMAIN;
// The dynamic AP endpoints (incl. /api/deliver) are served by the Edge Script
// on its own subdomain — the apex (AP_DOMAIN) is a Bunny Pull Zone with a
// Storage origin that rejects POST with 405. AP_DYNAMIC_BASE is a full
// https:// base URL (same one activitypub.mjs uses for inbox/outbox); fall
// back to the apex only if it's unset.
const dynBase = process.env.AP_DYNAMIC_BASE || (domain ? `https://${domain}` : '');

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

// Cold start: seal the back-catalogue (NOT the fresh candidates) so it's never
// replayed. The fresh candidates are recorded below only after they deliver.
if (seedIds) {
  await recordSyndicated(ACTIVITYPUB_TOKEN, seedIds);
  console.log(`ActivityPub: cold start — sealed ${seedIds.length} back-catalogue post(s) into the ledger`);
}

if (candidates.length === 0) {
  console.log('No new items opted into ActivityPub syndication');
  process.exit(0);
}

const deliverUrl = `${dynBase}/api/deliver`;

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
      const delivered = result.delivered ?? 0;
      const total = result.total ?? 0;
      // Record only if something actually landed (or there were no followers to
      // deliver to). /api/deliver returns 200 even when every inbox rejects, so
      // a 0/total result must NOT be recorded — otherwise it's sealed as "done"
      // and never retried. Note: with multiple followers this is per-POST, not
      // per-inbox, so a partial success records the post and won't re-attempt
      // the inboxes that failed.
      if (delivered > 0 || total === 0) {
        sent.push(postId(post));
        console.log(
          `ActivityPub: delivered ${post.collection}/${post.slug} (${delivered}/${total} inboxes)`
        );
      } else {
        console.warn(
          `ActivityPub: 0/${total} inboxes accepted ${post.collection}/${post.slug}; NOT recording (will retry). Per-inbox failures:`,
          JSON.stringify(result.failures || [])
        );
      }
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

// Record only what actually delivered (failures stay out so they retry next
// deploy). On cold start the back-catalogue was already sealed above.
await recordSyndicated(ACTIVITYPUB_TOKEN, sent);
