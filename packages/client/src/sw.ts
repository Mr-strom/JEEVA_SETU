/// <reference lib="webworker" />

const CACHE_NAME = 'jeevasetu-frontline-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

const sw = self as unknown as ServiceWorkerGlobalScope;

// 1. Install: Precache App Shell
sw.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching App Shell');
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  sw.skipWaiting();
});

// 2. Activate: Cleanup Old Caches
sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      ),
    ),
  );
  sw.clients.claim();
});

// 3. Fetch: Cache-First for Shell Assets, Network-First for API calls
sw.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // API Requests: Network-First with outbox fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Return 503 so outbox manager stores pending mutations
        return new Response(
          JSON.stringify({
            code: 'OFFLINE_NETWORK_UNAVAILABLE',
            message: 'Device is offline. Mutation captured in local outbox queue.',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }),
    );
    return;
  }

  // App Shell Assets (HTML, JS, CSS, SVG, Fonts): Cache-First Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }),
  );
});

export {};
