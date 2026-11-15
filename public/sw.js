// KIVO Browser — Offline Service Worker & Performance Cache v2
const CACHE_NAME = 'kivo-pwa-v2';

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
      .catch((err) => console.warn('[KIVO SW] Pre-cache notice:', err))
  );
});

// Activate: Purge ALL older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[KIVO SW] Purging old cache:', key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategic routing
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. ABSOLUTE BYPASS FOR ADMIN PORTAL & AUTHENTICATION
  // Never intercept, cache, or interfere with admin panel or auth operations
  if (
    url.pathname.startsWith('/kivoadmin') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/admin/') ||
    url.pathname.startsWith('/api/support/ticket') ||
    url.pathname.startsWith('/api/download/') ||
    url.pathname === '/health'
  ) {
    return; // Pass directly to network
  }

  // 2. Navigation Requests (User visits or enters ANY URL on the domain)
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

  // 3. Public Read-Only APIs (CMS content & download metadata): Network-first with cache fallback
  if (
    url.pathname === '/api/content' ||
    url.pathname === '/api/downloads/status'
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

  // 4. Any other API requests must NOT be cached
  if (url.pathname.startsWith('/api/')) {
    return; // Direct network
  }

  // 5. Static Assets (JS, CSS, Images, Fonts): Cache-First with Stale-While-Revalidate
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
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        // Instant response if in cache
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetchPromise;
      })
    );
    return;
  }
});
