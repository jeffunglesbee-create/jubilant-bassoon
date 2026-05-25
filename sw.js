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

const SW_VERSION  = '2026-05-25a';
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

// ── Drama Dial — Service Worker side (Patent Defense Layer 2+3) ──────────
// Server pushes FACTS (score changed). Client evaluates EXCITEMENT.
// _swDramaDial is synced from main thread via postMessage on every page load.
let _swDramaDial = 65; // default — overwritten by postMessage sync

self.addEventListener('message', e => {
  if (e.data?.type === 'PREF_UPDATE' && e.data.key === 'drama_dial') {
    _swDramaDial = e.data.value;
  }
});

// Load dial from IndexedDB on SW startup (fallback if postMessage hasn't fired)
(async function loadDialFromIDB(){
  try {
    const req = indexedDB.open('field_prefs', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('prefs'); };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('prefs', 'readonly');
      const get = tx.objectStore('prefs').get('drama_dial');
      get.onsuccess = () => { if (get.result >= 45 && get.result <= 90) _swDramaDial = get.result; };
    };
  } catch(e) {}
})();

// Client-side drama computation from raw game state
function computePushDrama(d) {
  const margin = Math.abs((d.homeScore||0) - (d.awayScore||0));
  const period = String(d.period || '').toLowerCase();
  const isFinal = period.includes('final');
  if (isFinal) return 0;
  const isLate = ['q4','ot','9th','3rd','extra','2nd half'].some(p => period.includes(p));
  if (!isLate) return margin < 5 ? 50 : 30;
  if (margin <= 3) return 90;
  if (margin <= 7) return 75;
  if (margin <= 12) return 55;
  return 30;
}

self.addEventListener('push', e => {
  e.waitUntil(handlePush(e.data));
});

async function handlePush(data) {
  let payload = {};
  try { payload = data ? data.json() : {}; } catch(_) {}

  // Silent heartbeat — no notification, just keep SW alive
  if (!payload.type) return;

  // ── SCORE_CHANGE: factual push from server (post-handleCron refactor) ──
  // Server sends raw game state. Client evaluates excitement.
  if (payload.type === 'SCORE_CHANGE') {
    const drama = computePushDrama(payload);
    if (drama < _swDramaDial) return; // suppress — below user's dial
    const margin = Math.abs((payload.homeScore||0) - (payload.awayScore||0));
    const crunchThreshold = Math.min(_swDramaDial + 20, 95);
    const isCrunch = drama >= crunchThreshold;
    const title = isCrunch ? `🔥 CRUNCH TIME` : `⚡ Worth watching`;
    const body = `${payload.away||'Away'} ${payload.awayScore||0}–${payload.homeScore||0} ${payload.home||'Home'} · ${payload.clock||''} ${payload.period||''}`;
    await self.registration.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-192.png',
      tag: `field-drama-${payload.gameId}`,
      renotify: isCrunch, // re-buzz for crunch time
      data: { gameId: payload.gameId, watchUrl: payload.watchUrl || '/', type: 'SCORE_CHANGE' },
      actions: payload.watchUrl ? [{action: 'watch', title: 'Watch Now'}] : []
    });
    return;
  }

  // ── DRAMA_THRESHOLD: legacy push (pre-refactor server still sends these) ──
  // Now filtered by Drama Dial — client decides whether to show
  if (payload.type === 'DRAMA_THRESHOLD') {
    const drama = payload.drama || 0;
    if (drama < _swDramaDial) return; // suppress — below user's dial
    const { sport, home, away, homeScore, awayScore, periodLabel,
            broadcast, gameId, watchUrl } = payload;
    const crunchThreshold = Math.min(_swDramaDial + 20, 95);
    const isCrunch = drama >= crunchThreshold;
    const title = isCrunch ? `🔥 CRUNCH TIME — ${sport || 'Game'}` : `⚡ ${sport || 'Game'} — ${homeScore}–${awayScore}`;
    const body  = `${home} vs ${away} · ${periodLabel || ''} · ${broadcast || 'Live'}`;
    await self.registration.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-192.png',
      tag: `field-drama-${gameId}`,
      renotify: isCrunch,
      data: { gameId, watchUrl: watchUrl || '/', type: 'DRAMA_THRESHOLD' },
      actions: watchUrl ? [{action: 'watch', title: 'Watch Now'}] : []
    });
    return;
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
