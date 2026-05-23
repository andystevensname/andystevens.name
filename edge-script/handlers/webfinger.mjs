import { buildWebFinger } from '../../src/lib/activitypub.mjs';

export default async (request) => {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource');
  if (!resource) {
    return new Response('missing resource', { status: 400 });
  }

  const doc = buildWebFinger(resource);
  if (!doc) {
    return new Response('not found', { status: 404 });
  }

  return new Response(JSON.stringify(doc), {
    status: 200,
    headers: {
      'Content-Type': 'application/jrd+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
