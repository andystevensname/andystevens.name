// Bumped to v4 so activate() drops andystevens-v3, which holds HTML cached
// under the old long max-age.
const VERSION = 'v4';
const CACHE = `andystevens-${VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE = [
  OFFLINE_URL,
  '/fonts/BebasNeue-Regular.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Navigation preload: the browser starts the document request in
    // parallel with service worker boot. It was disabled from 2026-09-09 to
    // 2026-10-09 because the preload request honours the HTTP cache, and HTML
    // was then served with max-age=2592000 — the preload would have handed
    // back the stale pages the document path below exists to bypass. HTML is
    // now max-age=0, so a preload always revalidates and is safe again.
    //
    // One residual: for roughly an hour on 2026-09-09 HTML went out with
    // max-age=25600000, so a reader from that window who has not been back
    // since could hold a page until 2027-07-02. They are repaired by the
    // no-cache fetch on any ClientRouter navigation, and this was judged not
    // worth another nine months without preload.
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'New on andystevens.name';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'new-post',
    data: { url: data.url || '/' },
    // Chromium-only; ignored on Safari/Firefox.
    actions: [{ action: 'unsubscribe', title: 'Mute' }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'unsubscribe') {
    event.waitUntil((async () => {
      const sub = await self.registration.pushManager.getSubscription();
      if (!sub) return;
      try {
        // Absolute, and hardcoded: this file is served verbatim from
        // public/ so there is no build-time env inlining the way the page
        // gets PUBLIC_AP_BASE. Same subdomain the page posts to, and the
        // same shape. (src/lib/webmentions.ts hardcodes its subdomain for
        // the same reason.) Was /.netlify/functions/push-unsubscribe, dead
        // since the move off Netlify to Bunny — the catch below swallowed
        // it, so the local unsubscribe still worked while the server kept a
        // stale subscription until the next push 410'd.
        await fetch('https://ap.andystevens.name/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      } catch {
        // Server unreachable — drop the local subscription anyway so the
        // user stops getting pushes; the server-side prune happens later
        // when the next push lands a 410.
      }
      await sub.unsubscribe();
    })());
    return;
  }

  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find((c) => c.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  })());
});

// Content-addressed paths: the filename changes when the bytes do, so these
// are safe to serve from cache indefinitely. Everything else on this origin
// is a document.
const IMMUTABLE = /^\/(_astro|fonts)\//;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isDocument =
    request.mode === 'navigate' ||
    (url.origin === self.location.origin && !IMMUTABLE.test(url.pathname));

  // Documents: network-first, and forced to revalidate.
  //
  // Two things were wrong here. Only request.mode === 'navigate' took this
  // path, but Astro's ClientRouter fetches the next page with plain fetch(),
  // so a clicked link fell through to the cache-first branch below and got
  // whatever was cached — permanently one navigation stale.
  //
  // And a plain fetch() honours the HTTP cache. The zone served HTML with
  // max-age=2592000, briefly 25600000, so a browser can hold a page for
  // months; that is how stale HTML — and the stale per-page CSP that blanked
  // client-side navigations — outlived the deploy that fixed it. 'no-cache'
  // forces revalidation regardless of freshness while still allowing a 304,
  // which is the only way to reach a browser that already cached a page.
  if (isDocument) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        // preloadResponse only exists for navigations; ClientRouter's fetch()
        // requests still take the forced-revalidation path.
        const preloaded = request.mode === 'navigate' ? await event.preloadResponse : undefined;
        const network = preloaded || (await fetch(request, { cache: 'no-cache' }));
        if (network.ok) cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await cache.match(request);
        return cached || (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Content-addressed assets and cross-origin media: cache-first, refreshed
  // in the background.
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});
