const CACHE = 'protein-match-v6';
const STATIC_ASSETS = [
  '/styles.css',
  '/app.js?v=6',
  '/data.js',
  '/favicon.png',
  '/manifest.json',
];

// Install — pre-cache only stable static assets (not HTML — let navigation always go fresh)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   navigate requests  → always go to network (never intercept page loads)
//   /api/*             → network-first, fall back to cache
//   static assets      → cache-first, update cache in background
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Let the browser handle all page navigations directly — no SW interception.
  // This is what was breaking tab bar navigation: clean-URL pages (/compare etc.)
  // weren't in cache so respondWith() was returning undefined.
  if (e.request.mode === 'navigate') return;

  // API calls: network-first with cached fallback for offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || Response.error()))
    );
    return;
  }

  // Static assets (CSS, JS, images): cache-first
  const isStatic = ['.css', '.js', '.png', '.json', '.woff2', '.woff'].some(
    ext => url.pathname.endsWith(ext)
  );
  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res && res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        });
        return cached || networkFetch;
      })
    );
  }
});
