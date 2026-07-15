const CACHE_NAME = 'scanner-prezzi-v2';
const CORE_ASSETS = [
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

  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHtml){
    // Page shell: always try the network first so updates show up immediately.
    // Falls back to the last cached copy only if there's no connection.
    event.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Libraries/fonts: serve from cache instantly, refresh in the background
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
    networkFetch;
    return cached;
  }
  const netResp = await networkFetch;
  if (netResp) return netResp;
  return new Response('Offline e risorsa non ancora salvata in cache. Apri una volta con connessione, poi funziona offline.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
