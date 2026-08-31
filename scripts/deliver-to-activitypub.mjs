import { federatable, ACTIVITYPUB_TOKEN } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { runSyndication, ledgerConfigured } from '../src/lib/syndicate.mjs';
import { dynamicBase } from '../src/lib/activitypub.mjs';

const deliverSecret = process.env.AP_DELIVER_SECRET;
const domain = process.env.AP_DOMAIN;
// /api/deliver is served by the Edge Script on its subdomain, not the apex
// (whose Storage origin rejects POST with 405). See dynamicBase().
const dynBase = dynamicBase();

if (!deliverSecret || !domain) {
  console.log('AP_DELIVER_SECRET or AP_DOMAIN not set, skipping ActivityPub delivery');
  process.exit(0);
}

if (!ledgerConfigured()) {
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

const deliverUrl = `${dynBase}/api/deliver`;

await runSyndication({
  target: ACTIVITYPUB_TOKEN,
  label: 'ActivityPub',
  posts,
  wants: federatable,
  send: async (post) => {
    const res = await fetch(deliverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliverSecret}`,
      },
      body: JSON.stringify({ slug: post.slug, collection: post.collection }),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn(
        `ActivityPub: delivery failed for ${post.collection}/${post.slug}: ${res.status}`,
        result.error || ''
      );
      return false; // leave out of the ledger so it retries next deploy
    }

    // /api/deliver returns 200 even when every inbox rejects, so record only if
    // something actually landed (or there were no followers). This is per-POST,
    // not per-inbox: a partial success records the post and won't re-attempt
    // the inboxes that failed.
    const delivered = result.delivered ?? 0;
    const total = result.total ?? 0;
    if (delivered > 0 || total === 0) {
      console.log(
        `ActivityPub: delivered ${post.collection}/${post.slug} (${delivered}/${total} inboxes)`
      );
      return true;
    }
    console.warn(
      `ActivityPub: 0/${total} inboxes accepted ${post.collection}/${post.slug}; NOT recording (will retry). Per-inbox failures:`,
      JSON.stringify(result.failures || [])
    );
    return false;
  },
});
