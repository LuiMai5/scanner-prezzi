const CACHE_NAME = 'scanner-prezzi-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(handleFetch(req));
});

async function handleFetch(req){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const networkFetch = fetch(req).then(resp => {
    if (resp && resp.status === 200) cache.put(req, resp.clone());
    return resp;
  }).catch(() => null);

  if (cached){
    // Serve instantly from cache, refresh cache in the background
    networkFetch;
    return cached;
  }
  const netResp = await networkFetch;
  if (netResp) return netResp;
  return new Response('Offline e risorsa non ancora salvata in cache. Apri una volta con connessione, poi funziona offline.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}