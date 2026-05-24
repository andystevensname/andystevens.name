// Bunny Edge Script — standalone mode. The script has its own hostname
// (assigned by Bunny when you create the script). The andystevens.name
// Pull Zone routes the dynamic-path prefixes here via Edge Rules:
//
//   /ap/*           -> this script's hostname
//   /api/*          -> this script's hostname
//   /.well-known/*  -> this script's hostname
//   /nodeinfo/*     -> this script's hostname
//
// Everything else on the Pull Zone keeps going to the static origin
// (Bunny Storage).
//
// We started in middleware mode and hit a documented limitation: a
// middleware script attached to a Pull Zone backed by a Storage Zone
// silently 405s POST requests before the script runs. Standalone scripts
// accept all methods, so federation POSTs to /ap/inbox and our push
// subscribe/unsubscribe endpoints work as intended.
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
