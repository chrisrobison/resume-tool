// service-worker.js - PWA Service Worker for Job Hunt Manager v2.0.0
// Provides offline support, caching, and PWA functionality

const APP_CACHE = 'job-hunt-manager-v2.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';
const LLM_CACHE = 'browser-llm-models'; // Keep for AI features

// Core app files to cache on install
const PRECACHE_URLS = [
  '/',
  '/app-responsive.html',
  '/jobs-responsive.css',
  '/logo.svg',
  '/manifest.json',

  // Core services
  '/js/services/indexeddb-service.js',
  '/js/services/storage-migration.js',
  '/js/services/extension-sync.js',

  // Components
  '/components/global-store.js',
  '/components/resume-editor.js',
  '/components/resume-viewer.js',

  // Icons
  '/extension/icons/icon16.png',
  '/extension/icons/icon32.png',
  '/extension/icons/icon48.png',
  '/extension/icons/icon128.png'
];

// Install - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS).catch(err => {
          console.warn('[SW] Some assets failed to cache:', err);
          // Continue anyway - non-critical
        });
      })
      .then(() => {
        console.log('[SW] Installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              return name !== APP_CACHE &&
                     name !== RUNTIME_CACHE &&
                     name !== LLM_CACHE;
            })
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated');
        return self.clients.claim();
      })
  );
});

// Fetch - smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Strategy 1: LLM Models & AI Assets (cache-first, very important)
  if (url.pathname.includes('/vendor/web-llm/') ||
      /\.(gguf|ggml|bin|wasm|model|pt|safetensors)$/i.test(url.pathname) ||
      url.hostname.includes('unpkg.com') && url.pathname.includes('@mlc-ai/web-llm')) {

    event.respondWith(
      caches.open(LLM_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) {
          console.log('[SW] Serving LLM asset from cache:', url.pathname);
          return cached;
        }

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            console.log('[SW] Caching LLM asset:', url.pathname);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          console.error('[SW] LLM asset fetch failed:', error);
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // Strategy 2: App navigation (HTML pages) - cache-first with update
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            // Clone immediately before any async operations
            const responseClone = response.clone();
            caches.open(APP_CACHE).then(cache => {
              cache.put(request, responseClone);
            }).catch(err => {
              console.warn('[SW] Failed to cache navigation:', err);
            });
          }
          return response;
        }).catch(err => {
          console.error('[SW] Navigation fetch failed:', err);
          throw err;
        });

        return cached || fetchPromise;
      }).catch(() => {
        return caches.match('/app-responsive.html');
      })
    );
    return;
  }

  // Strategy 3: Same-origin assets (CSS, JS, images) - cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Update cache in background (stale-while-revalidate)
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(APP_CACHE).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});

          return cached;
        }

        // Not cached, fetch and cache
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(APP_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 4: Cross-origin (CDN, APIs) - network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync (for future cloud sync)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-jobs') {
    event.waitUntil(syncJobs());
  }
});

async function syncJobs() {
  console.log('[SW] Syncing jobs with cloud...');
  // TODO: Implement when backend is ready
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Job Hunt Manager';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/extension/icons/icon128.png',
    badge: '/extension/icons/icon48.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/app-responsive.html')
  );
});

// Message handler - allow client to control cache
self.addEventListener('message', (event) => {
  const data = event.data || {};

  // Precache URLs (for AI models, etc.)
  if (data.type === 'precache-urls' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(LLM_CACHE).then(cache => {
        return Promise.all(
          data.urls.map(async (url) => {
            try {
              const req = new Request(url, { mode: 'no-cors' });
              const resp = await fetch(req);
              if (resp && resp.ok) {
                await cache.put(url, resp.clone());
              }
            } catch (error) {
              console.warn('[SW] Failed to precache:', url, error);
            }
          })
        );
      })
    );
  }

  // Skip waiting (force update)
  if (data.type === 'skip-waiting') {
    self.skipWaiting();
  }

  // Clear all caches
  if (data.type === 'clear-caches') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
