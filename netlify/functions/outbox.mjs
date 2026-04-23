import { config, buildNote } from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The outbox reads a posts.json manifest that your Astro build generates.
// See scripts/build-ap-manifest.mjs for the generation side.
//
// Why this works in a Netlify function: included files are bundled with the
// function. You can control inclusion via `[functions]` config in netlify.toml
// using `included_files = ["data/posts.json"]`.

export default async (request) => {
  const c = config();

  let posts = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // Adjust this path to wherever your build writes the manifest.
    const manifestPath = join(here, '..', '..', 'data', 'posts.json');
    posts = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (e) {
    console.warn('no posts manifest found:', e.message);
  }

  const items = posts.map((post) => {
    const note = buildNote(post);
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${note.id}/activity`,
      type: 'Create',
      actor: c.actorUrl,
      published: note.published,
      to: note.to,
      cc: note.cc,
      object: note,
    };
  });

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
