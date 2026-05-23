// Bunny Edge Scripting middleware entry. Bound to the andystevens.name Pull
// Zone; intercepts the dynamic-route paths (ActivityPub, push notifications,
// AP delivery trigger) and returns Responses inline. Everything else passes
// through to the static origin (Bunny Storage) unchanged.
//
// Each handler is a plain Web Fetch (Request) -> Response function reused
// from the old netlify/functions/ tree — they only needed to move directories
// to live here.

import * as BunnySDK from '@bunny.net/edgescript-sdk';

import webfinger from './handlers/webfinger.mjs';
import nodeinfo from './handlers/nodeinfo.mjs';
import actor from './handlers/actor.mjs';
import inbox from './handlers/inbox.mjs';
import outbox from './handlers/outbox.mjs';
import followers from './handlers/followers.mjs';
import note from './handlers/note.mjs';
import deliver from './handlers/deliver.mjs';
import pushSubscribe from './handlers/push-subscribe.mjs';
import pushUnsubscribe from './handlers/push-unsubscribe.mjs';

function route(pathname) {
  // Exact paths
  if (pathname === '/.well-known/webfinger') return webfinger;
  if (pathname === '/.well-known/nodeinfo') return nodeinfo;
  if (pathname === '/nodeinfo/2.0') return nodeinfo;
  if (pathname === '/ap/actor') return actor;
  if (pathname === '/ap/inbox') return inbox;
  if (pathname === '/ap/outbox') return outbox;
  if (pathname === '/ap/followers') return followers;
  if (pathname === '/api/deliver') return deliver;
  if (pathname === '/api/push/subscribe') return pushSubscribe;
  if (pathname === '/api/push/unsubscribe') return pushUnsubscribe;
  // Object lookup (slug, plus legacy /ap/notes/:slug)
  if (/^\/ap\/notes\/[^/]+\/?$/.test(pathname)) return note;
  if (/^\/ap\/objects\/[^/]+\/[^/]+\/?$/.test(pathname)) return note;
  return null;
}

const pullzone = BunnySDK.net.http.servePullZone();

pullzone.onOriginRequest(async ({ request }) => {
  const url = new URL(request.url);
  const handler = route(url.pathname);
  if (!handler) {
    // Static asset: let the request continue to the storage origin.
    return request;
  }
  try {
    return await handler(request);
  } catch (err) {
    console.error(`edge-script handler error for ${url.pathname}:`, err);
    return new Response('internal error', { status: 500 });
  }
});
