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

const SW_VERSION = '2026-07-11d';
const SHELL_CACHE = `field-shell-${SW_VERSION}`;
const API_CACHE   = 'field-api-v4';
const SHELL_URL   = '/';

self.addEventListener('install', e => {
  // PM-26-B (June 3 2026): Do NOT pre-fetch the shell here.
  // The install event fires moments after the page itself fetched the shell;
  // calling cache.add(SHELL_URL) re-downloads the same 425KB document and
  // ALSO strips the user's query string (e.g. ?wpt → caches bare /),
  // polluting the cache with a wrong-key entry.
  // The fetch handler's staleWhileRevalidate (below) populates SHELL_CACHE
  // naturally on the first shell request after activation, so removing this
  // is purely additive perf: -425 KB on every first visit / SW_VERSION bump.
  // WPT June 3 2026 confirmed the bare / fetch at 589 ms across three runs.
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      // Prune old shell caches keyed by previous SW_VERSION
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k.startsWith('field-shell-') && k !== SHELL_CACHE)
              .map(k => caches.delete(k))
        )
      ),
      // P4 — pre-warm API cache on activation so the page's first schedule
      // fetch hits cache instead of round-tripping. statsapi.mlb.com is in
      // the API_CACHE allowlist (see fetch handler isAPI gate) and the URL
      // here matches the form fetchScheduleData uses, so the entry is a
      // direct cache hit by request URL, not a separate key.
      prefetchScheduleData()
    ]).then(() => clients.claim())
  );
});

// P4 — Service Worker pre-warm (June 3 2026, startup polish bundle).
// Opportunistic; never blocks activate. A failure just leaves the API_CACHE
// in its previous state (cold or partially populated). The page-side
// fetchScheduleData will then fall through to network as before.
async function prefetchScheduleData(){
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url   = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team`;
    const cache = await caches.open(API_CACHE);
    const fresh = await fetch(url);
    if (fresh && fresh.ok) await cache.put(url, fresh.clone());
  } catch(_) { /* prefetch is opportunistic — never block activate */ }
}

// P5 — Anticipatory pre-fetch (June 3 2026, startup polish bundle).
// The page registers a 'field-prewarm' periodicSync; this listener reuses
// prefetchScheduleData to warm API_CACHE in the background near the user's
// predicted next-open hour. On-device pattern only; no payload from the page,
// no server-side scheduling needed for this leg (the predicted-hour analysis
// lives in the page; the SW just executes the prewarm when the platform fires
// the periodic sync event near that hour).
self.addEventListener('periodicsync', e => {
  if (e.tag === 'field-prewarm') {
    e.waitUntil(prefetchScheduleData());
  }
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

// ── Push trigger — Service Worker side (Patent Defense Layer 2+3) ────────
// Server pushes FACTS (score changed). Client evaluates a factual crunch
// gate — no scalar, no summed value, no user-adjustable threshold. This
// mirrors the isCrunchTimeGame()-style pattern already used client-side
// in index.html (period/margin AND, no intermediate numeric scale).
// The Drama Dial (_swDramaDial, removed 2026-07-06) no longer gates
// pushes -- it is purely a client-side display filter now (see
// getDramaDial() usages in index.html for badge/OTW/fire-icon rendering).

// isCrunchLikePush: single boolean, no scalar. The relay (Component 3)
// only emits SCORE_CHANGE for games already past its per-sport late +
// close gate, so every payload is already a late-game situation; this
// re-confirms lateness from the payload's own fields (tolerant of both
// SCORE_CHANGE's `period`/`periodNum` and legacy DRAMA_THRESHOLD's
// `periodLabel`) AND requires a genuinely close margin. AND, not a sum —
// no intermediate value is ever computed or compared to a threshold.
function isCrunchLikePush(d) {
  const period = String(d.period || d.periodLabel || '').toLowerCase();
  if (period.includes('final')) return false;
  const margin = Math.abs((d.homeScore||0) - (d.awayScore||0));
  const pn = Number(d.periodNum || 0);
  const veryLate = pn >= 4 || /\bot\b|\bso\b|extra/.test(period) ||
                   period.includes('9th') || period.includes("90'");
  return veryLate && margin <= 5;
}

// ── My Teams — Service Worker side sync (2026-07-06) ──────────────────────
// Reuses the SAME keyed PREF_UPDATE postMessage + IndexedDB pattern
// originally built for the Drama Dial -- it was always a generic, keyed
// channel, not dial-specific. The dial itself no longer needs SW-side sync
// (see isCrunchLikePush above), so this listener now only handles the
// 'my_teams' key. MY_TEAMS is a plain array of team name strings
// (index.html saveMyTeams()).
let _swMyTeams = new Set();

self.addEventListener('message', e => {
  if (e.data?.type !== 'PREF_UPDATE' || e.data.key !== 'my_teams') return;
  const teams = Array.isArray(e.data.value) ? e.data.value : [];
  _swMyTeams = new Set(teams);
  try {
    const req = indexedDB.open('field_prefs', 1);
    req.onupgradeneeded = ev => { ev.target.result.createObjectStore('prefs'); };
    req.onsuccess = ev => {
      const db = ev.target.result;
      const tx = db.transaction('prefs', 'readwrite');
      tx.objectStore('prefs').put(teams, 'my_teams');
    };
  } catch(err) {}
});

// Load My Teams from IndexedDB on SW startup (fallback if postMessage hasn't fired yet)
(async function loadMyTeamsFromIDB(){
  try {
    const req = indexedDB.open('field_prefs', 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore('prefs'); };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('prefs', 'readonly');
      const get = tx.objectStore('prefs').get('my_teams');
      get.onsuccess = () => { if (Array.isArray(get.result)) _swMyTeams = new Set(get.result); };
    };
  } catch(e) {}
})();

// isUserSelectedGame: does this push's game involve a team the user follows?
// Empty-favorites fallback (explicit choice, not left ambiguous): if the
// user hasn't favorited any team yet, show for all games clearing the
// crunch-like gate -- don't silently notify for nothing just because
// preferences aren't set up, but once they pick teams, scope to those.
function isUserSelectedGame(d) {
  if (_swMyTeams.size === 0) return true;
  return _swMyTeams.has(d.home) || _swMyTeams.has(d.away);
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
    const isCrunchLike = isCrunchLikePush(payload);
    if (!isCrunchLike) return;
    // ── WOW 2 (SW-side signal): if CRUNCH TIME determined here, signal DO ──
    // SW runs when the page is closed/backgrounded — this path emits the
    // signal so the DO can fan out to other pinned subscribers who don't
    // share the same heartbeat schedule. RUWT compliance: SW computed the
    // named binary condition locally; DO only delivers.
    // Fires regardless of THIS device's own My Teams preference -- it fans
    // out to other subscribers pinned to this specific game (pinGame()), a
    // separate selection mechanism from My Teams. Only the local
    // showNotification() below is scoped to this device's followed teams.
    if (payload.gameId && payload.sport) {
      const sportKey = String(payload.sport).toLowerCase();
      const gameIdRaw = String(payload.gameId).replace(/^[a-z]+:/, '');
      try {
        fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/signal/crunch/${encodeURIComponent(sportKey)}/${encodeURIComponent(gameIdRaw)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId:      gameIdRaw,
            period:      payload.periodNum ?? payload.period ?? null,
            periodLabel: payload.period || '',
            home:        payload.home || '',
            away:        payload.away || '',
            homeScore:   payload.homeScore ?? null,
            awayScore:   payload.awayScore ?? null,
            broadcast:   payload.broadcast || '',
            watchUrl:    payload.watchUrl || '/',
          }),
          keepalive: true,
        }).catch(()=>{ /* signal failure is non-blocking */ });
      } catch(_) { /* never block notification render on signal failure */ }
    }
    // Scope THIS device's own notification to the user's followed teams.
    if (!isUserSelectedGame(payload)) return;
    const title = `🔥 CRUNCH TIME`;
    const body = `${payload.away||'Away'} ${payload.awayScore||0}–${payload.homeScore||0} ${payload.home||'Home'} · ${payload.clock||''} ${payload.period||''}`;
    await self.registration.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-192.png',
      tag: `field-drama-${payload.gameId}`,
      renotify: true, // every push that reaches here is already crunch-like
      data: { gameId: payload.gameId, watchUrl: payload.watchUrl || '/', type: 'SCORE_CHANGE' },
      actions: payload.watchUrl ? [{action: 'watch', title: 'Watch Now'}] : []
    });
    return;
  }

  // ── DRAMA_THRESHOLD: legacy push (pre-refactor server still sends these) ──
  // Same factual boolean gate as SCORE_CHANGE — no scalar, no dial threshold.
  if (payload.type === 'DRAMA_THRESHOLD') {
    const { sport, home, away, homeScore, awayScore, periodLabel,
            broadcast, gameId, watchUrl } = payload;
    if (!isCrunchLikePush(payload)) return;
    if (!isUserSelectedGame(payload)) return;
    const title = `🔥 CRUNCH TIME — ${sport || 'Game'}`;
    const body  = `${home} vs ${away} · ${periodLabel || ''} · ${broadcast || 'Live'}`;
    await self.registration.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-192.png',
      tag: `field-drama-${gameId}`,
      renotify: true,
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

  // ── CRUNCH_TIME_SIGNAL: push fan-out from GameDO (WOW 2, May 31 2026) ──
  // Sent by a per-game DurableObject when another client signaled CRUNCH TIME.
  // Payload is factual (scores, period, broadcast). No composite value, no
  // server-side threshold — the originating client made the determination.
  if (payload.type === 'CRUNCH_TIME_SIGNAL') {
    const { gameId, home, away, homeScore, awayScore, periodLabel, broadcast, watchUrl } = payload;
    await self.registration.showNotification(`🔥 CRUNCH TIME`, {
      body: `${away||''} ${awayScore??''}–${homeScore??''} ${home||''} · ${periodLabel||''}${broadcast?' · '+broadcast:''}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `field-crunch-${gameId}`,
      renotify: true,
      data: { gameId, watchUrl: watchUrl || '/', type: 'CRUNCH_TIME_SIGNAL' },
      actions: watchUrl ? [{action:'watch', title:'Watch Now'}] : []
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
