const VERSION = 'v3';
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
        await fetch('/.netlify/functions/push-unsubscribe', {
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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          cache.put(request, preload.clone());
          return preload;
        }
        const network = await fetch(request);
        cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await cache.match(request);
        return cached || (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});
