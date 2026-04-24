import { buildFromManifestItem } from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Serves the AP object for /ap/objects/:collection/:slug. Also handles the
// legacy /ap/notes/:slug path (single-slug lookup).

export default async (request) => {
  const url = new URL(request.url);

  // Accept both path-based routing (/ap/objects/:collection/:slug or
  // /ap/notes/:slug, legacy) and query-string form (?slug=&collection=),
  // since Netlify's placeholder substitution into `to` query strings has
  // proven unreliable in practice.
  let slug = url.searchParams.get('slug');
  let collection = url.searchParams.get('collection');

  if (!slug) {
    const objects = url.pathname.match(/^\/ap\/objects\/([^/]+)\/([^/]+)\/?$/);
    const legacy = url.pathname.match(/^\/ap\/notes\/([^/]+)\/?$/);
    if (objects) {
      collection = objects[1];
      slug = objects[2];
    } else if (legacy) {
      slug = legacy[1];
    }
  }

  if (!slug) return new Response('missing slug', { status: 400 });

  let posts = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const manifestPath = join(here, '..', '..', 'data', 'posts.json');
    posts = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return new Response('no posts', { status: 404 });
  }

  const post = posts.find(
    (p) => p.slug === slug && (!collection || p.collection === collection)
  );
  if (!post) return new Response('not found', { status: 404 });

  if (post.apType === 'Like') {
    return new Response('likes are not standalone objects', { status: 404 });
  }

  const { object } = buildFromManifestItem(post);
  if (!object) return new Response('not found', { status: 404 });

  // Browser-friendly: if a human is hitting this URL, send them to the HTML page.
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') && !accept.includes('activity+json')) {
    return Response.redirect(post.url, 302);
  }

  return new Response(JSON.stringify(object), {
    status: 200,
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
