// KIVO Browser — Offline Service Worker & Performance Cache
const CACHE_NAME = 'kivo-pwa-v1';

const STATIC_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/kivo-logo.png',
  '/favicon.png',
  '/favicon.svg',
];

// Install: Pre-cache static shell & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[KIVO SW] Pre-cache warning:', err))
  );
});

// Activate: Clean older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategic routing for ultra-fast load (<1.5s) & complete offline navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass installer binary streams and admin chunk uploads
  if (
    url.pathname.startsWith('/api/download/') ||
    url.pathname.startsWith('/api/admin/upload') ||
    url.pathname === '/health'
  ) {
    return;
  }

  // 1. Navigation Requests (User visits or searches ANY URL on the domain while online or offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: Serve cached SPA shell so client-side router handles URL offline
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex =
            (await cache.match('/index.html')) || (await cache.match('/'));
          if (cachedIndex) return cachedIndex;
          return new Response(
            `<!DOCTYPE html><html><head><title>KIVO Offline</title><style>body{background:#050505;color:#fff;font-family:sans-serif;text-align:center;padding:50px 20px;}</style></head><body><h1>KIVO Browser</h1><p>You appear to be offline. Reconnect to access live services.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Read-only API Endpoints (CMS content & download metadata): Network-first with cache fallback
  if (
    url.pathname.startsWith('/api/content') ||
    url.pathname.startsWith('/api/downloads/status')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Cache-First with Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch fresh copy in background to keep cache up-to-date
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        // If in cache, return immediately (instant sub-10ms response)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise wait for network response
        return fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok && request.url.startsWith('http')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      );
    })
  );
});
