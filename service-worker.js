const APP_CACHE = 'app-shell-v1';
const LLM_CACHE = 'browser-llm-models';

// Files we attempt to pre-cache during install. Keep small and safe.
const PRECACHE_URLS = [
  '/job-tool/',
  '/job-tool/index.html',
  '/job-tool/app.html',
  '/job-tool/logo.svg',
  '/job-tool/styles.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Basic fetch handler: cache-first for app shell and assets; network fallback for others.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Prefer cache-first for vendor/web-llm assets and model files
  if (url.pathname.startsWith('/vendor/web-llm/') || /\.(gguf|ggml|bin|wasm|model|pt|safetensors)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(LLM_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.ok) cache.put(event.request, resp.clone());
          return resp;
        } catch (e) {
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // CDN runtime (e.g., unpkg mlc web-llm) - try cache then network
  if (event.request.url.includes('unpkg.com/@mlc-ai/web-llm')) {
    event.respondWith(
      caches.open(APP_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.ok) cache.put(event.request, resp.clone());
          return resp;
        } catch (e) {
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // App shell navigation: return cached index.html for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(APP_CACHE).then(cache => cache.match('/job-tool/index.html')).then(resp => resp || fetch(event.request))
    );
    return;
  }

  // Fallback: network first, then cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Message interface: allow client to ask the SW to precache model URLs
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'precache-urls' && Array.isArray(data.urls)) {
    caches.open(LLM_CACHE).then(cache => {
      data.urls.forEach(async (u) => {
        try {
          const req = new Request(u, { mode: 'no-cors' });
          const resp = await fetch(req);
          if (resp && resp.ok) await cache.put(u, resp.clone());
        } catch (e) {
          // ignore individual failures
        }
      });
    });
  }
});

