import { removePushSubscription } from '../../src/lib/storage.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  if (!body?.endpoint) {
    return new Response('missing endpoint', { status: 400 });
  }

  await removePushSubscription(body.endpoint);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
