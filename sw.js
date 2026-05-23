// FIELD — Service Worker v4
// May 18, 2026
//
// Cache strategy:
//   App shell (index.html): stale-while-revalidate
//     — Serve cached version immediately (<10ms), fetch fresh in background.
//     — Next load gets the updated version. Return visits feel instant.
//     — Cache keyed by SW_VERSION so deploys always bust the shell cache.
//   API responses: network-first with offline fallback
//     — Always try network; cache successful responses for offline use.
//
// Bump SW_VERSION on every deploy. CI smoke.js verifies it matches index.html.

const SW_VERSION  = '2026-05-23l';
const SHELL_CACHE = `field-shell-${SW_VERSION}`;
const API_CACHE   = 'field-api-v4';
const SHELL_URL   = '/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.add(SHELL_URL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('field-shell-') && k !== SHELL_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = e.request.url;
  const isShell = u === self.location.origin + '/' ||
                  u === self.location.origin + '/index.html';
  const isAPI   = u.includes('site.api.espn.com')   ||
                  u.includes('open-meteo.com')        ||
                  u.includes('api.sportsdb')           ||
                  u.includes('api.the-odds')            ||
                  u.includes('fantasy.premierleague')   ||
                  u.includes('statsapi.mlb.com');

  if(isShell){
    e.respondWith(staleWhileRevalidate(SHELL_CACHE, e.request));
    return;
  }
  if(isAPI){
    e.respondWith(networkFirstWithFallback(API_CACHE, e.request));
    return;
  }
});

async function staleWhileRevalidate(cacheName, request){
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request.clone()).then(fresh => {
    if(fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => null);
  return cached || fetchPromise;
}

async function networkFirstWithFallback(cacheName, request){
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request.clone());
    if(fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch(err) {
    const cached = await cache.match(request);
    return cached || new Response(
      JSON.stringify({error:'offline',cached:false}),
      {headers:{'Content-Type':'application/json'}}
    );
  }
}
