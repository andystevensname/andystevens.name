import { readFile } from 'node:fs/promises';
import { federatable } from '../../../src/lib/post-sources.mjs';

export const onSuccess = async function () {
  const deliverSecret = process.env.AP_DELIVER_SECRET;
  const domain = process.env.AP_DOMAIN;

  if (!deliverSecret || !domain) {
    console.log('AP_DELIVER_SECRET or AP_DOMAIN not set, skipping ActivityPub delivery');
    return;
  }

  let posts;
  try {
    posts = JSON.parse(await readFile('data/posts.json', 'utf8'));
  } catch (e) {
    console.warn('ActivityPub: no post manifest found, skipping:', e.message);
    return;
  }

  const cutoff = Date.now() - 10 * 60 * 1000;
  const candidates = posts.filter((p) => {
    if (new Date(p.published).getTime() < cutoff) return false;
    return federatable(p);
  });

  if (candidates.length === 0) {
    console.log('No new items opted into ActivityPub syndication');
    return;
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
};
