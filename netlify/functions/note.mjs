import { buildNote } from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export default async (request) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('missing slug', { status: 400 });

  let posts = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const manifestPath = join(here, '..', '..', 'data', 'posts.json');
    posts = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return new Response('no posts', { status: 404 });
  }

  const post = posts.find((p) => p.slug === slug);
  if (!post) return new Response('not found', { status: 404 });

  const note = buildNote(post);

  // If the request is clearly a browser (Accept: text/html), redirect to the
  // actual blog post. If it's an ActivityPub client, serve JSON.
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') && !accept.includes('activity+json')) {
    return Response.redirect(post.url, 302);
  }

  return new Response(JSON.stringify(note), {
    status: 200,
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
