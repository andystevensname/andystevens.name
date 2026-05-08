// Local-only manual trigger for push notifications. Used during
// `netlify dev` to test the push pipeline end-to-end without a real deploy.
//
// Usage (while `netlify dev` is running):
//   curl http://localhost:8888/.netlify/functions/push-test
//   curl http://localhost:8888/.netlify/functions/push-test?slug=dea6c
//
// Without slug: sends a notification for the most recently-published post.
// With slug:    sends for the matching post (any age).
//
// Production use: send-push-notifications build plugin handles the real
// flow on deploy. This function is for local-test only.

import { configureVapid, sendForPosts } from '../../src/lib/push-send.mjs';

export default async (request) => {
  if (process.env.NETLIFY_DEV !== 'true') {
    return new Response('disabled', { status: 404 });
  }
  if (!configureVapid()) {
    return new Response('VAPID env vars not set', { status: 500 });
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const slugFilter = url.searchParams.get('slug');

  let posts;
  try {
    const res = await fetch(`${origin}/post-manifest.json`);
    if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
    posts = await res.json();
  } catch (e) {
    return new Response(`could not load post-manifest: ${e.message}`, { status: 500 });
  }

  let candidates;
  if (slugFilter) {
    candidates = posts.filter((p) => p.slug === slugFilter);
    if (!candidates.length) {
      return new Response(`no post with slug ${slugFilter}`, { status: 404 });
    }
  } else {
    candidates = posts.slice(0, 1);
  }

  const result = await sendForPosts(candidates);
  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
