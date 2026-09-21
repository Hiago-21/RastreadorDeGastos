const CACHE_VERSION = 'fintracker-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/chart-fix.js',
  '/category-detail.js',
  '/manifest.json',
  '/img/icon.svg'
];

// Instala e pré-carrega todos os assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos ao ativar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network First (assets locais), Cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // APIs do Supabase e fontes externas: sempre busca na rede
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locais: Network First
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_VERSION).then(cache => {
        cache.put(event.request, responseToCache);
      });
      return response;
    }).catch(() => {
      // Falhou a rede, busca no cache
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Fallback: retorna index.html para navegação SPA
        if (event.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
