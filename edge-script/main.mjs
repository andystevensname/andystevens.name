// Bunny Edge Script — standalone mode, acts as the andystevensname
// Pull Zone's full origin. Two responsibilities:
//
//   1. Handle the dynamic paths (ActivityPub, push subscribe/unsubscribe,
//      AP deliver trigger) inline using the imported handlers.
//   2. Proxy everything else to Bunny Storage with the storage AccessKey
//      header — the Pull Zone itself can't send custom headers to origin,
//      so we send them from here.
//
// Pull Zone Origin URL is this script's bunny.run hostname. Pull Zone
// then caches the script's responses (including the static proxies)
// just like it would cache anything else.
//
// Env required on the script:
//   AP_*, VAPID_*, BUNNY_DATABASE_*, POST_MANIFEST_URL — same as before
//   BUNNY_S3_BUCKET_NAME       — storage zone name
//   BUNNY_STORAGE_REGION       — region constant (NewYork etc.)
//   BUNNY_STORAGE_ACCESS_KEY   — storage password / read or write token

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

const REGION_HOST_PREFIX = {
  Falkenstein: '',
  London: 'uk.',
  NewYork: 'ny.',
  LosAngeles: 'la.',
  Singapore: 'sg.',
  Stockholm: 'se.',
  SaoPaulo: 'br.',
  Johannesburg: 'jh.',
  Sydney: 'syd.',
};

const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'Falkenstein';
const STORAGE_PREFIX = REGION_HOST_PREFIX[STORAGE_REGION] ?? '';
const STORAGE_BUCKET = process.env.BUNNY_S3_BUCKET_NAME;
const STORAGE_KEY = process.env.BUNNY_STORAGE_ACCESS_KEY;
const STORAGE_BASE = `https://${STORAGE_PREFIX}storage.bunnycdn.com/${STORAGE_BUCKET}`;

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

// Astro outputs clean URLs (dir/index.html). Map them onto storage paths:
//   /                → /index.html
//   /articles/foo/   → /articles/foo/index.html
//   /articles/foo    → /articles/foo/index.html
//   /favicon.ico     → /favicon.ico   (last segment has a dot; leave alone)
function toStoragePath(pathname) {
  if (pathname.endsWith('/')) return pathname + 'index.html';
  const last = pathname.split('/').pop();
  if (last.includes('.')) return pathname;
  return pathname + '/index.html';
}

async function proxyStatic(pathname) {
  const storageUrl = STORAGE_BASE + toStoragePath(pathname);
  const res = await fetch(storageUrl, {
    headers: { AccessKey: STORAGE_KEY },
  });
  if (res.ok) {
    // Strip storage-internal headers; keep content-type and length.
    const headers = new Headers();
    const ct = res.headers.get('content-type');
    if (ct) headers.set('content-type', ct);
    const cl = res.headers.get('content-length');
    if (cl) headers.set('content-length', cl);
    return new Response(res.body, { status: 200, headers });
  }
  if (res.status === 404) {
    // Serve the built 404.html if Astro produced one.
    const fallback = await fetch(STORAGE_BASE + '/404.html', {
      headers: { AccessKey: STORAGE_KEY },
    });
    if (fallback.ok) {
      return new Response(fallback.body, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('not found', { status: 404 });
  }
  return new Response(`storage error: ${res.status}`, { status: 502 });
}

BunnySDK.net.http.serve(async (request) => {
  const url = new URL(request.url);
  const handler = route(url.pathname);
  if (handler) {
    try {
      return await handler(request);
    } catch (err) {
      console.error(`edge-script handler error for ${url.pathname}:`, err);
      return new Response('internal error', { status: 500 });
    }
  }
  try {
    return await proxyStatic(url.pathname);
  } catch (err) {
    console.error(`edge-script proxy error for ${url.pathname}:`, err);
    return new Response('proxy error', { status: 500 });
  }
});
