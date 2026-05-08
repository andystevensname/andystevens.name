import { addPushSubscription } from '../../src/lib/storage.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let sub;
  try {
    sub = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return new Response('invalid subscription', { status: 400 });
  }

  await addPushSubscription(sub, request.headers.get('user-agent'));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
