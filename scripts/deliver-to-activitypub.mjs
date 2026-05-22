import { federatable } from '../src/lib/post-sources.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';

const deliverSecret = process.env.AP_DELIVER_SECRET;
const domain = process.env.AP_DOMAIN;

if (!deliverSecret || !domain) {
  console.log('AP_DELIVER_SECRET or AP_DOMAIN not set, skipping ActivityPub delivery');
  process.exit(0);
}

let posts;
try {
  posts = await loadManifest();
} catch (e) {
  console.warn('ActivityPub: no post manifest found, skipping:', e.message);
  process.exit(0);
}

const cutoff = Date.now() - 60 * 60 * 1000;
const candidates = posts.filter((p) => {
  if (new Date(p.published).getTime() < cutoff) return false;
  return federatable(p);
});

if (candidates.length === 0) {
  console.log('No new items opted into ActivityPub syndication');
  process.exit(0);
}

const deliverUrl = `https://${domain}/api/deliver`;

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
      console.log(
        `ActivityPub: delivered ${post.collection}/${post.slug} (${result.delivered}/${result.total} inboxes)`
      );
    } else {
      console.warn(
        `ActivityPub: delivery failed for ${post.collection}/${post.slug}: ${res.status}`,
        result.error || ''
      );
    }
  } catch (e) {
    console.warn(`ActivityPub: delivery error for ${post.collection}/${post.slug}:`, e.message);
  }
}
