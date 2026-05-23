import { config, buildFromManifestItem } from '../../src/lib/activitypub.mjs';
import { federatable } from '../../src/lib/post-sources.mjs';
import { loadManifest } from '../../src/lib/manifest.mjs';

export default async () => {
  const c = config();

  let posts = [];
  try {
    posts = await loadManifest();
  } catch (e) {
    console.warn('no posts manifest found:', e.message);
  }

  // Likes aren't owned objects — skip them in the outbox. Posts that
  // didn't opt into ActivityPub aren't federated either.
  const items = posts
    .filter(federatable)
    .filter((p) => p.apType !== 'Like')
    .map((post) => buildFromManifestItem(post).activity)
    .filter(Boolean);

  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: c.outboxUrl,
    type: 'OrderedCollection',
    totalItems: items.length,
    orderedItems: items,
  };

  return new Response(JSON.stringify(collection), {
    status: 200,
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' },
  });
};
