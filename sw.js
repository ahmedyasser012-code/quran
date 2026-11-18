// Service Worker for Cairo Quran & Prayer Display
// Provides complete offline caching for Smart TVs and web browsers

const CACHE_NAME = 'cairo-quran-tv-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    'https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400&family=Readex+Pro:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Cache addAll warning (non-fatal):', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const reqUrl = event.request.url;

    // Do NOT intercept live radio streams, large audio files, or live API calls
    if (
        reqUrl.includes('.mp3') ||
        reqUrl.includes('stream') ||
        reqUrl.includes('radio') ||
        reqUrl.includes('api.aladhan.com') ||
        reqUrl.includes('api.open-meteo.com')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Fetch in background to update cache (stale-while-revalidate)
                fetch(event.request).then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkRes));
                    }
                }).catch(() => {});
                return cached;
            }

            return fetch(event.request).then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                    const cloned = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                }
                return networkRes;
            }).catch(() => {
                // Offline fallback to index.html if navigating
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
