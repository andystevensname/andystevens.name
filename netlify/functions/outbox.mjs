import { config, buildFromManifestItem } from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export default async (request) => {
  const c = config();

  let posts = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const manifestPath = join(here, '..', '..', 'data', 'posts.json');
    posts = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (e) {
    console.warn('no posts manifest found:', e.message);
  }

  // Likes aren't owned objects — skip them in the outbox.
  const items = posts
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
