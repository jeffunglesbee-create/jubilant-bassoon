# CC Session — 2026-07-18 — Browser Verify Debrief Card + Gap 12

**HEAD progression:** 5f8ea77 → 22dd4fe → b7f1f26 (after rebase: b7f1f26)
**Smoke:** 958/0 (start and end)
**SW_VERSION:** 2026-07-18b → 2026-07-18c (bumped in b7f1f26)
**Scope:** jubilant-bassoon only

---

## Commits

### 22dd4fe — fix: propagate V2 _gameId to allData.sports so injectDebriefCards uses ESPN event ID
- Root cause found: `fetchV2AllScores` sets `_gameId` on `espnScores[key]` via `mapV2ToESPN`
  but did NOT propagate it to `allData.sports` game objects.
- `injectDebriefCards` reads from `allData.sports` (not `espnScores`), so MLB cards'
  `rawGame._gameId` was always undefined → fallback to internal `g{n}` ID.
- Relay hit: `/context/game/g18` returns pre-game brief; `/context/game/espn:401816164`
  returns correct post-game brief.
- Fix: extend the round/series propagation block in `fetchV2AllScores` to also write
  `v2Entry._gameId` onto `_rGame` if not already set. If card was already stamped with
  `data-debrief-injected`, remove it and re-schedule `injectDebriefCards`.

### b7f1f26 — chore: bump SW_VERSION to 2026-07-18c
- Required per Rule 4. Every deploy-triggering commit bumps SW_VERSION.

---

## Verification Results

### TASK 1 — Debrief card render (50 pts) — CONFIRMED ✓
- Game: Cubs 6, Twins 2 (MLB_2026-07-18_cubs_twins, espn:401816164, state: post)
- Card: `data-gameid="g18"` (internal MLB ID), `data-debrief-injected="1"`
- `.card-debrief[data-slot="debrief"]` visible (hidden=false)
- Brief text: "Wrigley Field, which plays 8% higher for home runs, hosted a 6-2 Cubs victory
  tonight. Nico Hoerner finished 4-for-4 with an RBI tonight, while Michael Busch hit a
  home run in his 1-for-4 night..."
- Cache key: `https://field-local/debrief/espn%3A401816164` (correct ESPN event ID)

**Pre-fix behavior (same session, before deploy):**
- Brief text: "Wrigley Field plays host to a matchup where the +4% runs and +8% HR
  environment should favor the bats tonight. Taj Bradley brings his arm..."
- Cache key: `https://field-local/debrief/g18` (wrong — internal ID)

### TASK 2 — Gap 12 offline cache survival (35 pts) — CONFIRMED (partial) ✓
- Cache API entry `espn%3A401816164` confirmed present with `X-Cache-Time` timestamp
- Cache read path verified: with relay fetch blocked (simulated offline), `caches.open('field-debriefs').match(espn%3A401816164)` returns correct post-game brief
- Limitation: Playwright `setOffline(true)` not available via MCP browser tool, so literal
  "page reload while offline" test was not performed. The cache write path, key correctness,
  and read-when-relay-blocked path are verified. Full offline page reload is STAGED for
  verification in an environment with direct Playwright access.

### TASK 3 — Bug fix (15 pts) — SHIPPED ✓
- Bug: V2 `_gameId` not propagated to `allData.sports` → wrong cache key + pre-game brief
- Fix: `fetchV2AllScores` line ~14443 in field.js — added `|| v2Entry._gameId` to condition
  and `_rGame._gameId = v2Entry._gameId` assignment with re-injection trigger
- Smoke: 958/0 ✓, `node --check` ✓, deploy gate ✓, Client Live Invariant ✓
- SW_VERSION: 2026-07-18c

---

## Integration Status
- VERIFIED E2E: `injectDebriefCards` → `/context/game/espn:401816164` → post-game brief rendered ✓
- VERIFIED: Gap 12 cache-first read path (Cache API hit when relay blocked) ✓
- STAGED: Full browser offline reload test (requires Playwright `setOffline` or CDP offline mode)

## Residual
- `g29`/`g30` orphan cache entries exist from the race-condition window (debrief injected
  before V2 arrived). These are 7-day TTL Cache API entries that will evict naturally.
  The re-injection fix catches them on the same page load once V2 arrives.
