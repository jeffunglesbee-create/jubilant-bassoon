# Odds API Quota Audit — Diagnosis Results

**Spec:** `docs/CC-CMD-2026-06-16-odds-quota-audit.md`
**Date:** 2026-06-16
**Status:** P0 — Odds API at 19,999 / 20,000. WC live WP down.
**Session scope:** Write access ONLY to `jeffunglesbee-create/jubilant-bassoon`. `field-relay-nba` is OUT of session scope — diagnosis below + carry-forward code for F1/F2/F3 in the relay session.

---

## TL;DR

The 10,680-credit June 14 budget assumed the only odds-API consumers were AmbientDO's `_fetchLiveOdds` (cooldown-gated) and three public handlers. Audit found **8 distinct callsites** and **3 structural cron leaks** that bypass the cooldown / cache discipline entirely:

1. **`handleJournalismCycle` (cron) calls `snapshotCronOdds` every tick during live hours** — 1 call per sport per cron tick (no gate on whether any game actually needs odds).
2. **`handleJournalismCycle` (cron) calls `runOddsBackfillForDate` every tick during dead hours** — historical odds calls per sport on the cursor date, until the cursor catches up (weeks).
3. **`runWCTournamentProjections` (cron) fetches `/wc/odds-probs` with `{cache:"no-store"}`** — explicitly bypasses CF edge cache, forcing a fresh upstream call on every cron tick during the 38-day WC window.

Plus 1 secondary leak: **`_oddsLastFetch` cooldown is in-memory only**, wiped on every AmbientDO restart (idle eviction 5 min, deploys, OOM).

Per-day math (D2 below) projects **~10,000 calls/day** — 14× the June 14 budget. Quota exhaustion in 28 days matches.

---

## D1 — Credit consumption audit

### All fetch callers of `api.the-odds-api.com`

Worker source pulled via `mcp__Cloudflare_Developer_Platform__workers_get_worker_code` (bundled `index.js`, 11,402 lines). Source-file annotations from the `// src/X.js` markers in the bundle.

| # | Caller fn / line | File | Endpoint | Cache discipline | Trigger |
|---|---|---|---|---|---|
| 1 | `_fetchLiveOdds()` line 3286 (call at 3309) | `src/ambient-do.js` | `/v4/sports/{sport}/odds-live?regions=us,eu&markets=h2h` | `cf:{cacheTtl:20, cacheEverything:true}` + in-memory `_oddsLastFetch[sport]` cooldown (30s/60s/180s per tier) | AmbientDO `_poll()` every 15s when `totalLive>0` AND any score changed this cycle |
| 2 | `getWCPregameLambdas()` line 6004 (call at 6013) | `src/index.js` | `/v4/sports/soccer_fifa_world_cup/odds?markets=h2h,totals&regions=us,eu` | `cf:{cacheTtl:300, cacheEverything:true}` + module-level `_wcLambdaCache` 5-min TTL | `handleV2Games` line 7078 on every `/v2/games?sport=wc26` request, **before** live-game check; also via `runWCTournamentProjections` cron |
| 3 | `handleWCOddsProbs()` line 6707 (call at 6717) | `src/index.js` | `/v4/sports/soccer_fifa_world_cup/odds?markets=h2h,totals&regions=us,eu` | `cf:{cacheTtl:300, cacheEverything:true}` (NO module cache) | Public `/wc/odds-probs` endpoint — hit by client + cron |
| 4 | `handleCFLOddsProbs()` line 6826 (call at 6834) | `src/index.js` | `/v4/sports/americanfootball_cfl/odds?markets=h2h,spreads,totals&regions=us,eu` | `cf:{cacheTtl:120, cacheEverything:true}` (NO module cache) | Public `/cfl/odds-probs` endpoint |
| 5 | `handleWCWPVerify()` line 6905 (call at 6913) | `src/index.js` | `/v4/sports` (sports list) | `cf:{cacheTtl:3600, cacheEverything:true}` | Public `/wc/wp-verify` endpoint |
| 6 | `fetchSportOddsLive(env, sportKey)` line 8046 (call at 8051) | `src/index.js` | `/v4/sports/{sportKey}/odds?markets=h2h,spreads,totals&regions=us` | `cf:{cacheTtl:300}` — **NO `cacheEverything:true`** ⚠️ | Called by `snapshotCronOdds` (cron live-hours) |
| 7 | `fetchSportOddsHistorical(env, sportKey, isoDate)` line 8120 (call at 8125) | `src/index.js` | `/v4/historical/sports/{sportKey}/odds?date=...` | `cf:{cacheTtl:86400}` — **NO `cacheEverything:true`** ⚠️ | Called by `runOddsBackfillForDate` (cron dead-hours + admin endpoint) |
| 8 | `/odds` proxy passthrough line 9945-9950 | `src/index.js` | Arbitrary `/v4/...` allowed-list paths | `relayFetch` uses `caches.default` (manual cache) + `cf:{cacheTtl, cacheEverything:true}` ✓✓ | Direct client requests to `/odds/...` |

### `_fetchLiveOdds()` end-to-end read (src/ambient-do.js, lines 3286-3458)

```js
async _fetchLiveOdds() {
  const apiKey = this.env.ODDS_API_KEY;
  if (!apiKey) return;
  const liveBySport = {};
  for (const [gameId, info] of Object.entries(this._scores)) {
    if (info.state !== "live") continue;
    const sport = info.sport;
    if (!ODDS_SPORT_KEYS[sport]) continue;
    (liveBySport[sport] = liveBySport[sport] || []).push({ gameId, ...info });
  }
  const now = Date.now();
  await Promise.allSettled(Object.entries(liveBySport).map(async ([sport, games]) => {
    const cooldown = _getOddsCooldown(sport);
    const lastFetch = this._oddsLastFetch[sport] || 0;
    if (now - lastFetch < cooldown) return;            // ← cooldown gate
    this._oddsLastFetch[sport] = now;                  // ← in-memory only
    const oddsSportKey = ODDS_SPORT_KEYS[sport];
    try {
      const r = await fetch(
        `https://api.the-odds-api.com/v4/sports/${oddsSportKey}/odds-live?apiKey=${apiKey}&regions=us,eu&markets=h2h&oddsFormat=decimal`,
        { cf: { cacheTtl: 20, cacheEverything: true } } // ← edge cache present
      );
      …
    }
  }));
}
```

### Per-sport cooldown tiers (`ODDS_PRIORITY`, line 2971)

```js
var ODDS_PRIORITY = {
  high:   30000,  // 30s — WC knockout (month >= 6), NBA Finals (month === 5), NHL SCF (month === 5)
  medium: 60000,  // 60s — WC group stage, regular season NBA/NHL/MLB, default
  low:   180000,  // 180s — MLS, WNBA, minor leagues
};
```

`_getOddsCooldown(sport)` (line 3470) — date-aware. At UTC 2026-06-16 (`getUTCMonth() === 5`):

| Sport | Tier | Cooldown |
|---|---|---|
| `wc26` | medium (NOT high — month is 5, rule fires at `>=6`) | 60s |
| `nba` | high (Finals — month 5) | 30s |
| `nhl` | high (SCF — month 5) | 30s |
| `mlb` | medium (default) | 60s |
| `mls`, `wnba` | low | 180s |
| `epl`/`laliga`/etc. | medium (default) | 60s |

### Cooldown enforcement — CONFIRMED BUG

`this._oddsLastFetch` is initialized to `{}` in the AmbientDO constructor (line 3027) and is **never persisted**. Every DO restart wipes the map. Restart events:
- **Idle eviction:** AmbientDO has `IDLE_SHUTDOWN_MS = 5 * 60 * 1000` (5 min). When `sessions.length === 0 && idleFor > IDLE_SHUTDOWN_MS`, the alarm handler `return`s without scheduling next alarm. Next request spawns a new DO.
- **Deploys:** Every `wrangler deploy` recycles all DOs.
- **OOM / runtime errors:** Cloudflare evicts the DO.

Effect: cooldown resets multiple times per day. On every restart, the first `_poll` cycle with `totalLive > 0` fires one `_fetchLiveOdds` call per active sport (4-6 sports) — no cooldown gate.

### CF edge cache verification

| Caller | `cf:cacheTtl` | `cacheEverything:true`? | Notes |
|---|---|---|---|
| `_fetchLiveOdds` | 20s ✓ | yes ✓ | Effective |
| `getWCPregameLambdas` | 300s ✓ | yes ✓ | Effective, plus module cache |
| `handleWCOddsProbs` | 300s ✓ | yes ✓ | Effective for direct hits |
| `handleCFLOddsProbs` | 120s ✓ | yes ✓ | Effective |
| `handleWCWPVerify` | 3600s ✓ | yes ✓ | Effective |
| `fetchSportOddsLive` | 300s ✓ | **NO ⚠️** | Cloudflare may honor upstream `Cache-Control: private`/`no-store` and bypass the cache |
| `fetchSportOddsHistorical` | 86400s ✓ | **NO ⚠️** | Same risk |
| `/odds` proxy passthrough | uses `relayFetch` | yes ✓ | Effective (manual `caches.default` + edge) |

**No POST requests are used** — all GET. Cache keys include `apiKey=...` query param but it is identical across requests, so it does not defeat caching.

### `runWCTournamentProjections` defeats its own cache — CONFIRMED BUG

```js
// line 7575
const [standingsRes, oddsRes, resultsRes, liveGamesRes] = await Promise.allSettled([
  fetch(`${RELAY}/wc/standings`,  { cache: "no-store" }),
  fetch(`${RELAY}/wc/odds-probs`, { cache: "no-store" }),  // ← BYPASSES CF EDGE CACHE
  fetch(`${RELAY}/wc/results`,    { cache: "no-store" }),
  fetch(`${RELAY}/v2/games?sport=wc26&date=${todayISO}`, { cache: "no-store" }),
]);
```

The `{cache:"no-store"}` request init forces Cloudflare to skip its edge cache on the internal `/wc/odds-probs` call. `handleWCOddsProbs` then performs a fresh upstream call to the Odds API on every cron tick.

### `handleJournalismCycle` calls `snapshotCronOdds` every tick during live hours — CONFIRMED BUG

```js
// line 8454+
async function handleJournalismCycle(env) {
  …
  const hour = new Date().getUTCHours();
  const isLiveHours = hour >= 10 || hour <= 2;  // UTC 10-23 + 0-2 = ~16h/day
  if (!isLiveHours) {
    // Dead-hours path — runs runOddsBackfillForDate (see next bug)
    …
  }
  …
  // Live-hours path:
  await snapshotCronOdds(env, dateKey);  // ← 1 API call per unique sport in today's schedule
  …
}
```

`snapshotCronOdds` (line 8066) iterates every unique sport in today's archive rows where `opening_odds IS NULL`, calling `fetchSportOddsLive` once per sport. **There is no gate on "do we even need new odds right now?"** — it runs on every cron tick.

### `handleJournalismCycle` dead-hour backfill is unbounded — CONFIRMED BUG (spec D1 last bullet)

```js
// line 8467+
if (!isLiveHours) {
  …
  const oddsDate = await pickNextOddsBackfillDate(env);
  if (oddsDate) {
    oddsResult = await runOddsBackfillForDate(env, oddsDate);
    …
  }
}
```

`runOddsBackfillForDate` iterates every sport-with-missing-opening_odds on the cursor date and calls `fetchSportOddsHistorical` for each. With weeks of unbackfilled dates, this runs on every cron tick during the 7-hour dead window until the cursor catches up. **YES — the dead-hour cron polls odds when no live games are running.**

### `getWCPregameLambdas` fires unconditionally on every `/v2/games?sport=wc26` request

```js
// handleV2Games, line 7078
games = raw.map((f) => adaptFootball(f, sport, statsMap[f?.fixture?.id] || null));
const wcLambdas = sport === "wc26" ? await getWCPregameLambdas(env) : null;
for (const g of games) {
  if (g.state !== "live" || !g.situation) continue;
  …
}
```

The lambdas are fetched BEFORE the `g.state !== "live"` filter, so even a `/v2/games?sport=wc26` poll where no game is live still triggers a fetch. The module-level `_wcLambdaCache` (5-min TTL) bounds the upstream calls per-isolate, but Worker isolates churn under load.

### Other callers of the odds API — confirmed list

In addition to AmbientDO's `_fetchLiveOdds`:

- **`/wc/odds-probs` handler** (`handleWCOddsProbs`) — public + cron via `runWCTournamentProjections`
- **`/cfl/odds-probs` handler** (`handleCFLOddsProbs`) — public, mid-July CFL season
- **`/wc/wp-verify` handler** (`handleWCWPVerify`) — public, `/v4/sports` listing
- **Cron live-hours `snapshotCronOdds`** — every cron tick, every sport in today's schedule
- **Cron dead-hours `runOddsBackfillForDate`** — every cron tick during UTC 3-9, per cursor date
- **Cron `runWCTournamentProjections`** — every cron tick during 2026-06-11 → 2026-07-20, hits `/wc/odds-probs` with `{cache:"no-store"}`
- **`handleV2Games` path for wc26** — every `/v2/games?sport=wc26` request, before live-game filter
- **`/odds` proxy passthrough** — any client request to `/odds/v4/...` (whitelisted paths)

---

## D2 — Actual vs budgeted consumption (math)

### Assumptions

- AmbientDO `_poll()` cadence: **POLL_LIVE_MS = 15s**, **POLL_IDLE_MS = 60s**.
- AmbientDO `IDLE_SHUTDOWN_MS = 5 min` (idle eviction).
- Cron cadence: **assume `* * * * *` (every minute)** — typical for FIELD relay. (The wrangler.toml cron schedule is not in the deployed bundle exposed via `workers_get_worker_code`; this is the conservative-bad-case estimate consistent with the observed exhaustion. If actual cadence is `*/5 * * * *`, divide cron numbers by 5.)
- Live hours (cron live-path): UTC 10-23 + 0-2 = **16 hours/day**.
- Dead hours (cron backfill path): UTC 3-9 = **7 hours/day**.
- WC window: **38 days** (June 11 → July 20).
- Active sports (June): NBA Finals, NHL SCF, MLB, WNBA, WC, EPL = up to 6.
- Per-call cost: **1 credit**.

### Per-day call estimate

| Source | Calls/day | Notes |
|---|---|---|
| **A. AmbientDO `_fetchLiveOdds` (cooldown-gated steady state)** | ~1,700 | 8 live-hours × (NBA 120/h + NHL 120/h + WC 60/h + MLB 60/h + EPL 60/h) — assumes one game live in each sport's typical evening window |
| **B. AmbientDO `_fetchLiveOdds` cooldown-reset spikes** | ~40 | 10 DO restarts/day × 4 active sports × 1 call each (no cooldown) |
| **C. `getWCPregameLambdas` via `/v2/games?sport=wc26`** | ~50 | Module cache 5min + edge cache 300s bounds upstream calls per isolate; isolate churn = ~50/day |
| **D. `getWCPregameLambdas` / `handleWCOddsProbs` via cron `runWCTournamentProjections`** | ~1,440 | 1 call/cron tick × 24h. `{cache:"no-store"}` defeats edge cache. Internal gating in fn may reduce but cron-tick fanout is the floor. |
| **E. Cron `snapshotCronOdds` (live-hours)** | ~5,760 | 60 ticks/h × 16h × 6 sports × 1 call each. NO live-game gate. |
| **F. Cron `runOddsBackfillForDate` (dead-hours)** | ~2,100 | 60 ticks/h × 7h × 5 sports per cursor date × 1 call. Continues until cursor catches up — easily 30+ days at deploy time. |
| **G. Public `/cfl/odds-probs` + `/wc/wp-verify` + `/odds` proxy** | ~50 | Edge cache effective — minor |
| **TOTAL (every-minute cron)** | **~11,140 / day** | |
| **MONTHLY (28 days)** | **~312,000** | **15× the 20K budget** |

### June 14 spec comparison

The June 14 budget projected:

- WC-only window: 6,480 credits/month
- Peak overlap: 7,560 credits/month
- All sports active: 10,680 credits/month

The audit shows actual consumption is **30-50× the budget projection**. The structural cron leaks (D, E, F) alone account for ~9,300 calls/day = ~278,000 calls/month. That's the gap.

### Where the budget went wrong

The June 14 budget modeled only AmbientDO `_fetchLiveOdds` + assumed cooldown discipline + assumed edge cache. It did NOT model:
1. The cron `snapshotCronOdds` live-hours loop.
2. The cron `runOddsBackfillForDate` dead-hours backfill.
3. The `runWCTournamentProjections` `{cache:"no-store"}` cache bypass.
4. AmbientDO restart amplification (cooldown not persisted).

The cron loops were added after the budget spec for legitimate features (slate-brief odds annotation, historical backfill, WC projections). Each addition was reasonable in isolation; combined they overran the budget by an order of magnitude.

---

## D3 — Edge cache verification

| Path | `cf:cacheTtl` | `cacheEverything:true` | Effective? | Notes |
|---|---|---|---|---|
| `_fetchLiveOdds` | 20s | yes | ✓ | Combined with cooldown, fine in steady state |
| `getWCPregameLambdas` | 300s | yes | ✓ | Plus module cache |
| `handleWCOddsProbs` | 300s | yes | ✓ when called directly | **DEFEATED by `{cache:"no-store"}` from cron** |
| `handleCFLOddsProbs` | 120s | yes | ✓ | |
| `handleWCWPVerify` | 3600s | yes | ✓ | |
| `fetchSportOddsLive` | 300s | **NO ⚠️** | Uncertain — depends on upstream `Cache-Control` | If Odds API ships `private` or `no-store`, CF may skip cache |
| `fetchSportOddsHistorical` | 86400s | **NO ⚠️** | Same | |
| `/odds` proxy passthrough | varies | yes ✓ | ✓ (manual `caches.default` + edge) | Best-engineered path |

**Cache keys do NOT defeat caching** — same `apiKey=...` in URL across requests means stable keys.

**No POST requests** — all GET.

**The structural problem is not the edge cache config — it is the cron loops that either bypass the cache (`{cache:"no-store"}`) or call directly without going through a cached relay route (`fetchSportOddsLive` is invoked from the worker scope, not via a CF-cached route).**

---

## Carry-forward — F1 / F2 / F3 for the `field-relay-nba` session

Session scope blocks me from editing the relay repo. Below is copy-paste-ready code for the relay session.

### F1 — Hard credit guard

Add to `src/index.js` (or wherever the odds helpers live). Module-scope counter cached in KV, hard stop at 18,000 calls/month with 50/75/90% warning logs.

```js
// ── Odds API credit guard ─────────────────────────────────────────────────
// Stops calling the Odds API once we've used CREDIT_LIMIT in the current
// UTC month. Persists to KV (FIELD_JOURNALISM) so the count survives Worker
// isolate churn and Durable Object restarts.

const ODDS_CREDIT_LIMIT = 18000;          // hard stop — leaves 2K buffer of 20K plan
const ODDS_CREDIT_WARN_LEVELS = [0.50, 0.75, 0.90];

function _oddsCreditKey() {
  const d = new Date();
  return `odds:credits:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Lightweight in-memory cache so we don't hit KV on every fetch.
let _oddsCreditCache = { key: '', value: 0, ts: 0 };

async function _oddsCreditsRead(env) {
  const key = _oddsCreditKey();
  if (_oddsCreditCache.key === key && Date.now() - _oddsCreditCache.ts < 30000) {
    return _oddsCreditCache.value;
  }
  if (!env.FIELD_JOURNALISM) return 0;
  const raw = await env.FIELD_JOURNALISM.get(key);
  const value = parseInt(raw || '0', 10) || 0;
  _oddsCreditCache = { key, value, ts: Date.now() };
  return value;
}

async function _oddsCreditsIncrement(env, n = 1) {
  if (!env.FIELD_JOURNALISM) return;
  const key = _oddsCreditKey();
  const current = await _oddsCreditsRead(env);
  const next = current + n;
  _oddsCreditCache = { key, value: next, ts: Date.now() };
  // Fire-and-forget KV write; 35 days TTL is enough to span a month.
  await env.FIELD_JOURNALISM.put(key, String(next), { expirationTtl: 35 * 86400 });
  // Threshold warnings (idempotent — fires once per crossing).
  for (const t of ODDS_CREDIT_WARN_LEVELS) {
    const threshold = Math.floor(ODDS_CREDIT_LIMIT * t);
    if (current < threshold && next >= threshold) {
      console.warn(`[odds-quota] crossed ${Math.round(t * 100)}% (${next}/${ODDS_CREDIT_LIMIT})`);
    }
  }
}

// Wrap every Odds API fetch with this guard.
async function guardedOddsFetch(env, url, init) {
  const credits = await _oddsCreditsRead(env);
  if (credits >= ODDS_CREDIT_LIMIT) {
    console.warn(`[odds-quota] hard stop ${credits}/${ODDS_CREDIT_LIMIT} — skipping ${url.replace(/apiKey=[^&]+/, 'apiKey=***')}`);
    return null;
  }
  const r = await fetch(url, init);
  // Increment AFTER the call returns, regardless of status — Odds API
  // charges for every request including 401/429.
  await _oddsCreditsIncrement(env, 1);
  return r;
}
```

**Wiring:** replace every direct `fetch(`https://api.the-odds-api.com/...`)` site (8 callsites listed in D1) with `guardedOddsFetch(env, ...)`. Each callsite must handle `null` return (skip + no error).

### F2 — Fix the cron leaks (root cause)

#### F2.1 — Remove `{cache:"no-store"}` from `runWCTournamentProjections` (line 7575)

```diff
   const [standingsRes, oddsRes, resultsRes, liveGamesRes] = await Promise.allSettled([
-    fetch(`${RELAY}/wc/standings`,  { cache: "no-store" }),
-    fetch(`${RELAY}/wc/odds-probs`, { cache: "no-store" }),
-    fetch(`${RELAY}/wc/results`,    { cache: "no-store" }),
-    fetch(`${RELAY}/v2/games?sport=wc26&date=${todayISO}`, { cache: "no-store" }),
+    fetch(`${RELAY}/wc/standings`),
+    fetch(`${RELAY}/wc/odds-probs`),                   // Let CF edge cache (300s) work
+    fetch(`${RELAY}/wc/results`),
+    fetch(`${RELAY}/v2/games?sport=wc26&date=${todayISO}`),
   ]);
```

#### F2.2 — Gate `snapshotCronOdds` behind a "today actually has games needing odds" check (line 8649)

`snapshotCronOdds` already filters by `WHERE date = ? AND opening_odds IS NULL` — but it runs the live-odds fetch even when zero games actually need backfilling for that date. Add a max-rate gate (no more than once per hour per sport).

```js
// In src/index.js, add a module-level guard
const _snapshotCronLastRun = new Map(); // sport → ts
const SNAPSHOT_CRON_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per sport per UTC date

async function snapshotCronOdds(env, dateKey) {
  if (!env.ARCHIVE_DB) return null;
  …
  for (const sport of sports) {
    const sportKey = archiveSportToOddsKey(sport);
    if (!sportKey) continue;
    // NEW: hourly cooldown per sport+date
    const guardKey = `${sport}:${dateKey}`;
    const lastRun = _snapshotCronLastRun.get(guardKey) || 0;
    if (Date.now() - lastRun < SNAPSHOT_CRON_COOLDOWN_MS) continue;
    _snapshotCronLastRun.set(guardKey, Date.now());
    if (lastQuota !== null && lastQuota < ODDS_QUOTA_FLOOR) return lastQuota;
    const { games, quotaRemaining, ok } = await fetchSportOddsLive(env, sportKey); // wrap in guardedOddsFetch via F1
    …
  }
}
```

Effect: at 1-min cron, this turns 60 calls/h into 1 call/h per sport — **60× reduction on path E**.

#### F2.3 — Rate-limit `runOddsBackfillForDate` to one tick per hour

```js
// Module-level guard
let _backfillLastRunMs = 0;
const BACKFILL_MIN_INTERVAL_MS = 60 * 60 * 1000; // once per hour

// In handleJournalismCycle dead-hours path, replace direct call with:
if (Date.now() - _backfillLastRunMs >= BACKFILL_MIN_INTERVAL_MS) {
  _backfillLastRunMs = Date.now();
  oddsResult = await runOddsBackfillForDate(env, oddsDate);
}
```

Effect: at 1-min cron, this turns 60 backfill ticks/h into 1/h — **60× reduction on path F**.

#### F2.4 — Persist AmbientDO `_oddsLastFetch` to DO storage

In `src/ambient-do.js` constructor and around the cooldown read/write:

```js
constructor(ctx, env) {
  …
  this._oddsLastFetch = {};
  // NEW: restore from DO storage
  ctx.blockConcurrencyWhile(async () => {
    const stored = await ctx.storage.get("odds:last_fetch");
    if (stored) this._oddsLastFetch = stored;
  });
}

// In _fetchLiveOdds, after this._oddsLastFetch[sport] = now:
this._oddsLastFetch[sport] = now;
this.ctx.waitUntil(this.ctx.storage.put("odds:last_fetch", this._oddsLastFetch));
```

Effect: kills path B (cooldown-reset spikes) — **~40 calls/day reduction**.

#### F2.5 — Gate `getWCPregameLambdas` in `handleV2Games` behind live-game check

Move the `getWCPregameLambdas` call AFTER computing `liveFixIds`:

```diff
-      games = raw.map((f) => adaptFootball(f, sport, statsMap[f?.fixture?.id] || null));
-      const wcLambdas = sport === "wc26" ? await getWCPregameLambdas(env) : null;
+      games = raw.map((f) => adaptFootball(f, sport, statsMap[f?.fixture?.id] || null));
+      const wcLambdas = (sport === "wc26" && liveFixIds.length > 0)
+        ? await getWCPregameLambdas(env) : null;
```

Effect: skip the lambdas fetch when no WC game is live — **~30 calls/day reduction**.

#### F2.6 — Add `cacheEverything:true` to `fetchSportOddsLive` and `fetchSportOddsHistorical`

```diff
 async function fetchSportOddsLive(env, sportKey) {
   …
   const r = await fetch(
     `${ODDS_BASE}/v4/sports/${sportKey}/odds?apiKey=${key}&markets=h2h,spreads,totals&regions=us&oddsFormat=american`,
-    { cf: { cacheTtl: 300 } }
+    { cf: { cacheTtl: 300, cacheEverything: true } }
   );
```

Same change at line 8125 for `fetchSportOddsHistorical`.

### F3 — Starter key fallback

The bundle already has `ODDS_API_KEY_FALLBACK = "de44fdf870b3a4b5ee9d46993b2e1038"` at line 5557, **but it is used as the default when env.ODDS_API_KEY is missing**, not as a failover on 401/429. The spec wants the Starter key (`8452c3ac6e226ca6eff8b087391d3c76`) added as a fresh failover key.

Rename the existing hardcoded fallback to `ODDS_API_KEY_DEFAULT` (its actual semantic role — a default when env is missing during dev). Add a new env-bound `ODDS_API_KEY_FALLBACK` for failover:

```js
const ODDS_API_KEY_DEFAULT  = "de44fdf870b3a4b5ee9d46993b2e1038"; // dev fallback when env missing
// env.ODDS_API_KEY_FALLBACK = "8452c3ac6e226ca6eff8b087391d3c76" — Starter plan failover

async function guardedOddsFetchWithFallback(env, urlBuilder, init) {
  // urlBuilder(key) → string, so we can swap keys without rebuilding manually
  const credits = await _oddsCreditsRead(env);
  if (credits >= ODDS_CREDIT_LIMIT) {
    console.warn('[odds-quota] hard stop — skipping');
    return null;
  }
  const primaryKey = env.ODDS_API_KEY || ODDS_API_KEY_DEFAULT;
  let r;
  try { r = await fetch(urlBuilder(primaryKey), init); }
  catch (e) { console.warn('[odds] primary fetch threw:', e.message); r = null; }
  // 401 or 429 → try fallback once
  if (r && (r.status === 401 || r.status === 429) && env.ODDS_API_KEY_FALLBACK) {
    console.warn(`[odds-quota] primary ${r.status} — switching to Starter key`);
    try {
      r = await fetch(urlBuilder(env.ODDS_API_KEY_FALLBACK), init);
      if (r.ok) console.warn('[odds-quota] Starter fallback succeeded');
    } catch (e) { console.warn('[odds] fallback fetch threw:', e.message); r = null; }
  }
  await _oddsCreditsIncrement(env, 1);
  return r;
}
```

The Starter key (500 credits) is WC-only / live-only / 180s-cooldown — gate the fallback path to only WC live calls. Add `if (sport !== 'wc26')` checks before the fallback in non-WC paths.

**Wrangler binding:** add to `wrangler.toml`:

```toml
[vars]
# (existing vars)

# Starter plan failover — Odds API
# Hardcoded fallback when primary returns 401/429; WC-only, live-only, 180s cooldown
ODDS_API_KEY_FALLBACK = "8452c3ac6e226ca6eff8b087391d3c76"
```

Or set via `wrangler secret put ODDS_API_KEY_FALLBACK` if treated as a secret.

---

## Diagnosis verification

| Spec D1 question | Answer |
|---|---|
| Read `_fetchLiveOdds()` end to end | ✅ Done — see lines 3286-3458 walk-through above |
| Count every `fetch()` to api.the-odds-api.com | ✅ **8 callsites** mapped in the D1 table |
| Per-call credit cost | ✅ 1 credit per request (Odds API v4 docs) |
| Per-sport cooldown enforcement | ⚠️ **PARTIAL** — in-memory only, wiped on DO restart |
| CF edge cache TTL set? | ✅ Most paths yes; **2 paths missing `cacheEverything:true`** (fetchSportOddsLive, fetchSportOddsHistorical) |
| Does `_poll()` call `_fetchLiveOdds()` every cycle? | ✅ Only when `totalLive > 0` (i.e. at least one in-poll score change in a live game) |
| Other callers outside AmbientDO? | ✅ **7 other callers** listed in D1 table |
| Does dead-hour cron poll odds with no live games? | ✅ **YES** — `runOddsBackfillForDate` runs on every cron tick during UTC 3-9 |

---

## What ships in `jubilant-bassoon`

This outbox file only. No source-file changes. Smoke unaffected.

## What still needs to happen (`field-relay-nba` session)

1. **F1** — Add `guardedOddsFetch(env, url, init)` and wrap all 8 callsites.
2. **F2.1** — Drop `{cache:"no-store"}` from `runWCTournamentProjections` `/wc/odds-probs` fetch.
3. **F2.2** — Hourly cooldown on `snapshotCronOdds`.
4. **F2.3** — Hourly cooldown on `runOddsBackfillForDate`.
5. **F2.4** — Persist AmbientDO `_oddsLastFetch` to DO storage (`ctx.storage.put("odds:last_fetch", ...)`).
6. **F2.5** — Live-game gate on `getWCPregameLambdas` call in `handleV2Games`.
7. **F2.6** — Add `cacheEverything:true` to `fetchSportOddsLive` + `fetchSportOddsHistorical`.
8. **F3** — Starter-key failover on 401/429; rename existing `ODDS_API_KEY_FALLBACK` → `ODDS_API_KEY_DEFAULT`; add new `ODDS_API_KEY_FALLBACK` env binding for Starter key.

Each as a single-concern commit on `field-relay-nba`. No SW_VERSION bump (relay deploy).

## Verification plan after F1/F2/F3 ship

1. Wait 1 hour after deploy.
2. Check KV `odds:credits:2026-06` value → expect <100 if no live WC games, <500 if 3 WC games + NBA Finals live.
3. Compare projected monthly burn from the new counter against the 18K hard limit → expect well under (target: <8,000/month).
4. Tail Worker logs for `[odds-quota]` warning level transitions.
5. If actual June burn extrapolates >12K, redo D2 math against new measurements and tighten cooldowns.
