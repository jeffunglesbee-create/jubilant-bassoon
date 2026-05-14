// FIELD — Service Worker
// fieldglobalsportsintelligence.pages.dev
// Extracted from Blob URL: May 14, 2026
//
// Cache strategy: API-only (not app shell).
// index.html always loads fresh from Cloudflare CDN — no stale HTML on redeploy.
// ESPN scores, weather, odds, SportsDB responses are cached for offline fallback.
//
// Cache version: field-api-v3
// Bump CACHE string on any structural change to fetch/cache logic.
// No version bump needed for index.html content changes — HTML is not cached here.
//
// APIs cached:
//   site.api.espn.com  — live scores, standings
//   open-meteo.com     — venue weather
//   api.sportsdb       — soccer fixtures
//   api.the-odds       — betting lines

const CACHE = 'field-api-v3';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  const u = e.request.url;
  const isAPI = u.includes('site.api.espn.com') ||
                u.includes('open-meteo.com')     ||
                u.includes('api.sportsdb')        ||
                u.includes('api.the-odds');
  if(!isAPI) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      try {
        const fresh = await fetch(e.request.clone());
        if(fresh.ok) cache.put(e.request, fresh.clone());
        return fresh;
      } catch(err) {
        const cached = await cache.match(e.request);
        return cached || new Response(
          JSON.stringify({error:'offline', cached:false}),
          {headers:{'Content-Type':'application/json'}}
        );
      }
    })
  );
});
