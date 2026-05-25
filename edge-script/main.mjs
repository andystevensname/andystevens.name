// Bunny Edge Script — standalone mode, served at ap.andystevens.name
// (custom hostname on the script). Handles dynamic endpoints only;
// webfinger and the actor JSON are pre-generated as static files on
// the apex domain by scripts/generate-static-ap.mjs.
//
// Architecture:
//   andystevens.name (apex)  → Pull Zone → Storage Zone
//     /.well-known/webfinger     static JSON (points to subdomain actor URLs)
//     /ap/actor                   static JSON (canonical actor id)
//     /                            site
//   ap.andystevens.name (script) → handles POSTs and remaining GETs
//     /ap/inbox, /ap/outbox, /ap/followers, /ap/notes/*, /ap/objects/*
//     /api/deliver, /api/push/subscribe, /api/push/unsubscribe
//     /.well-known/nodeinfo, /nodeinfo/2.0
//
// We tried single-Pull-Zone approaches (middleware mode, standalone w/
// Edge Rules, script-as-origin) and each hit a different Bunny edge
// limitation (POST blocked on Storage origin, 508 loops on script-side
// fetch back to storage). Subdomain split sidesteps all of them.

import * as BunnySDK from '@bunny.net/edgescript-sdk';

import nodeinfo from './handlers/nodeinfo.mjs';
import inbox from './handlers/inbox.mjs';
import outbox from './handlers/outbox.mjs';
import followers from './handlers/followers.mjs';
import note from './handlers/note.mjs';
import deliver from './handlers/deliver.mjs';
import pushSubscribe from './handlers/push-subscribe.mjs';
import pushUnsubscribe from './handlers/push-unsubscribe.mjs';

function route(pathname) {
  if (pathname === '/.well-known/nodeinfo') return nodeinfo;
  if (pathname === '/nodeinfo/2.0') return nodeinfo;
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

// Paths called from the andystevens.name browser context need CORS;
// everything else is server-to-server (federation) where CORS doesn't
// apply.
const CORS_PATHS = new Set(['/api/push/subscribe', '/api/push/unsubscribe']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://andystevens.name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

BunnySDK.net.http.serve(async (request) => {
  const url = new URL(request.url);
  const needsCors = CORS_PATHS.has(url.pathname);

  if (request.method === 'OPTIONS' && needsCors) {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const handler = route(url.pathname);
  if (!handler) {
    return new Response('not found', { status: 404 });
  }

  let response;
  try {
    response = await handler(request);
  } catch (err) {
    console.error(`edge-script handler error for ${url.pathname}:`, err);
    response = new Response('internal error', { status: 500 });
  }

  return needsCors ? withCors(response) : response;
});
