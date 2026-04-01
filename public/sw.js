const CACHE_NAME = 'wtsim-cache-v2';

// Ficheiros estáticos mínimos para o arranque rápido
const PRECACHE_ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorar pedidos que não sejam GET (ex: extensões, analytics)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar pedidos que não são HTTP ou HTTPS (ex: chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Interceptar modelos pesados (GLB / GLTF) e outras mídias
  if (url.pathname.endsWith('.glb') || url.pathname.endsWith('.gltf') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`[ServiceWorker] Serving from Cache: ${url.pathname}`);
          return cachedResponse;
        }

        console.log(`[ServiceWorker] Fetching from Network: ${url.pathname}`);
        return fetch(event.request).then((networkResponse) => {
          // Apenas envia para a cache se a resposta for sadia
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
  } else {
    // Para ficheiros normais HTML/JS/CSS, estratégia Rede 1º e falha para o Cache 
    // (Garante ter sempre a versão mais atual do código)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
