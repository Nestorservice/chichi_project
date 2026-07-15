const CACHE_NAME = 'mboa-resto-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.webp'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only cache GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // Always go to network directly for API requests
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Network-First with Cache Fallback for static assets and web page
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Fallback to root index.html if navigating HTML offline
          if (e.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
