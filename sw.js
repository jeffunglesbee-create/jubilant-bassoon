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

const SW_VERSION  = '2026-05-23q';
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

// ── PUSH C: Push notification handler ─────────────────────────────────────────
// PUSH C (May 24 2026). Receives push events from field-relay-nba cron Worker.
// Two modes:
//   1. Silent heartbeat (no drama data) → SW does nothing (background keepalive)
//   2. Drama payload → SW shows DRAMA_THRESHOLD notification
// Heartbeat architecture: relay cron polls scores every 5 min, computes drama,
//   only sends visible payload when drama ≥ drama_min threshold.
//   Result: lock-screen notification with full context, no app open needed.

self.addEventListener('push', e => {
  e.waitUntil(handlePush(e.data));
});

async function handlePush(data) {
  let payload = {};
  try { payload = data ? data.json() : {}; } catch(_) {}

  // Silent heartbeat — no notification, just keep SW alive
  if (!payload.type) return;

  if (payload.type === 'DRAMA_THRESHOLD') {
    const { sport, home, away, homeScore, awayScore, periodLabel,
            broadcast, drama, gameId, watchUrl } = payload;
    const scoreline = `${homeScore}–${awayScore}`;
    const title = `🎯 ${sport || 'Game'} — ${scoreline}`;
    const body  = `${home} vs ${away} · ${periodLabel || ''} · ${broadcast || 'Live'} · Drama ${drama}`;
    const icon  = '/icon-192.png';
    const badge = '/icon-192.png';
    const actions = watchUrl
      ? [{action: 'watch', title: 'Watch Now'}]
      : [];

    await self.registration.showNotification(title, {
      body, icon, badge, actions,
      tag: `field-drama-${gameId}`,     // replaces previous notif for same game
      renotify: false,                   // don't buzz again for same game
      data: { gameId, watchUrl: watchUrl || '/', type: 'DRAMA_THRESHOLD' },
    });
  }

  if (payload.type === 'DECISIVE_MOMENT') {
    const { seriesState, home, away, broadcast, gameId, watchUrl } = payload;
    await self.registration.showNotification(`⚡ ${seriesState || 'Overtime'}`, {
      body: `${away} @ ${home} · ${broadcast || 'Live'}`,
      icon: '/icon-192.png',
      tag: `field-decisive-${gameId}`,
      data: { gameId, watchUrl: watchUrl || '/', type: 'DECISIVE_MOMENT' },
    });
  }
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.watchUrl || '/';
  if (e.action === 'watch' || !e.action) {
    e.waitUntil(
      clients.matchAll({type:'window', includeUncontrolled:true}).then(cs => {
        const field = cs.find(c => c.url.includes(self.location.origin));
        if (field) {
          field.focus();
          if (url !== '/') field.navigate ? field.navigate(url) : null;
        } else {
          clients.openWindow(url !== '/' ? url : self.location.origin);
        }
      })
    );
  }
});
