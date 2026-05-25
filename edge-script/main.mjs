// Bunny Edge Script — standalone mode. Handles the dynamic paths
// (ActivityPub, push subscribe/unsubscribe, AP deliver trigger).
//
// Architecture: the andystevensname Pull Zone has its origin set to
// the storage HTTP endpoint (URL type, not Storage Zone type — that
// type triggers Bunny's POST-blocking bug). Pull Zone Edge Rules:
//   - inject AccessKey header (so storage fetches authenticate);
//   - override origin URL to this script for /ap/*, /api/*,
//     /.well-known/*, /nodeinfo/2.0.
//
// We don't try to proxy storage from the script — fetching the storage
// HTTP endpoint from within Bunny's edge network triggers their internal
// loop protection (HTTP 508).
//
// Each handler is a plain Web Fetch (Request) -> Response function
// reused from the old netlify/functions/ tree.

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
  if (/^\/ap\/notes\/[^/]+\/?$/.test(pathname)) return note;
  if (/^\/ap\/objects\/[^/]+\/[^/]+\/?$/.test(pathname)) return note;
  return null;
}

BunnySDK.net.http.serve(async (request) => {
  const url = new URL(request.url);
  const handler = route(url.pathname);
  if (!handler) {
    return new Response('not found', { status: 404 });
  }
  try {
    return await handler(request);
  } catch (err) {
    console.error(`edge-script handler error for ${url.pathname}:`, err);
    return new Response('internal error', { status: 500 });
  }
});
