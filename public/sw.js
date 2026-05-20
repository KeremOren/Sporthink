/**
 * Sporthink Service Worker
 *
 * Strategies:
 *  - Static assets (icons, manifest): cache-first
 *  - HTML/Navigations: network-first (fallback offline page)
 *  - API: network-only (no offline)
 *  - Other (images, fonts): stale-while-revalidate
 *
 * Push notifications: receives push events and shows native notifications.
 */

const CACHE_VERSION = 'sporthink-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-72.png',
    '/icons/icon-96.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-152.png',
    '/icons/icon-192.png',
    '/icons/icon-384.png',
    '/icons/icon-512.png',
];

// ===== Install: pre-cache static assets =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] precache failed:', err))
    );
});

// ===== Activate: cleanup old caches =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => !key.startsWith(CACHE_VERSION))
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// ===== Fetch: route by request type =====
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Same-origin only
    if (url.origin !== self.location.origin) return;

    // API: network-only (no caching)
    if (url.pathname.startsWith('/api/')) {
        return; // Let browser handle normally
    }

    // Auth: never cache
    if (url.pathname.startsWith('/_next/') && url.pathname.includes('/auth/')) {
        return;
    }

    // Static icons & manifest: cache-first
    if (
        url.pathname.startsWith('/icons/') ||
        url.pathname === '/manifest.json' ||
        url.pathname === '/favicon.ico'
    ) {
        event.respondWith(cacheFirst(req));
        return;
    }

    // Next.js static chunks: stale-while-revalidate
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(staleWhileRevalidate(req));
        return;
    }

    // HTML / navigations: network-first
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(networkFirst(req));
        return;
    }

    // Other (images, fonts): stale-while-revalidate
    event.respondWith(staleWhileRevalidate(req));
});

async function cacheFirst(req) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(req) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
    } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        // Offline fallback page
        return new Response(
            `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Sporthink — Çevrimdışı</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#333;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}.card{background:#fff;border-radius:16px;padding:40px;text-align:center;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}.icon{font-size:64px;margin-bottom:16px}h1{margin:0 0 8px;font-size:1.4rem}p{color:#666;margin:0 0 20px}button{background:#E53935;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer}</style></head><body><div class="card"><div class="icon">📡</div><h1>Çevrimdışısınız</h1><p>İnternet bağlantınızı kontrol edip tekrar deneyin.</p><button onclick="location.reload()">Tekrar Dene</button></div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
        );
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
    }).catch(() => cached);
    return cached || networkPromise;
}

// ===== Push notifications =====
self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data?.json() || {};
    } catch {
        payload = { title: 'Sporthink', body: event.data?.text() || 'Yeni bildirim' };
    }

    const title = payload.title || 'Sporthink Bildirim';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: payload.tag || 'sporthink-notif',
        data: payload.data || {},
        requireInteraction: payload.urgent || false,
        actions: payload.actions || [],
        vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/dashboard';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});

// ===== Background sync (placeholder for future use) =====
self.addEventListener('sync', (event) => {
    if (event.tag === 'sporthink-sync') {
        // could re-send queued analytics, etc.
    }
});
