// CricketHub Service Worker v1.0
const CACHE_NAME = 'crickethub-v1.0';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/animations.css',
  '/css/components.css',
  '/css/screens.css',
  '/js/app.js',
  '/js/db.js',
  '/js/state.js',
  '/js/router.js',
  '/js/utils.js',
  '/js/pwa.js',
  '/js/screens/splash.js',
  '/js/screens/home.js',
  '/js/screens/create-match.js',
  '/js/screens/team.js',
  '/js/screens/toss.js',
  '/js/screens/scoring.js',
  '/js/screens/scorecard.js',
  '/js/screens/summary.js',
  '/js/screens/history.js',
  '/js/screens/statistics.js',
  '/js/screens/settings.js',
  '/js/screens/about.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (except Google Fonts)
  const url = new URL(event.request.url);
  const isGoogleFonts = url.hostname.includes('fonts.googleapis.com') ||
                        url.hostname.includes('fonts.gstatic.com');

  if (url.origin !== location.origin && !isGoogleFonts) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => {
          // For navigation requests, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Background sync (future feature placeholder)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
});

// Push notifications (future feature placeholder)
self.addEventListener('push', event => {
  console.log('[SW] Push received');
});
