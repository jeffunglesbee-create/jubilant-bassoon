# CC Outbox — ESPN GOTD Structural Auto-Detection

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-espn-gotd-structural-detection.md
**Commit:** 1780803
**Smoke:** n/a (build-field-data.js change — no smoke assertion covers this)

---

## Pre-build probe results

- `assignMLBBroadcast(game, dateStr, rawBroadcasts)` — function at line 132 (now 177 post-insert), NOT async, single call site at line 395 inside `parseMLBFull()`
- ESPN GOTD detection block (original): used `ESPN_GOTD_LOOKUP[dateStr]` and `ESPN_GOTD_IDS.includes(...)` — no structural signal from any live API
- `build-field-data.js` uses `const https = require('https')` (line 22) — native `https.request()` pattern throughout; NO `fetch()` used anywhere. CC-CMD's code example used `fetch()` — implementation correctly converted to `https.request()` to match existing convention (Rule 62)
- `parseESPNSoccer()` already queries `site.api.espn.com` with identical `https.request()` pattern; confirmed field names: `comp.competitors`, `t.homeAway === 'home'`, `home.team?.displayName` — independent corroboration of ESPN API field shapes
- `main()` at line 550: `const mlbGames = await parseMLBFull()` — single call site, await-based
- `site.api.espn.com` BLOCKED from CC sandbox (proxy 403 via pre-configured agent proxy) — live field verification not possible; `parseESPNSoccer` corroborated field names instead

---

## Tasks 1 + 2 — Implementation

### Task 1: `fetchEspnMlbGotd(dateStr)` added

Inserted after `_lookupEspnCableSlot` helper and before `NHL_TEAMS` (the broadcast-helper zone, adjacent to `assignMLBBroadcast`). Uses `https.request()` — NOT `fetch()` — to match the established pattern.

Key design decisions vs CC-CMD code example:
- Used `function fetchEspnMlbGotd` returning `new Promise(...)` (not `async function`) to match `parseESPNSoccer` style
- Error resolve sends `gotdKeys` (the empty Set), not `null` — so callers never see a non-Set value
- `console.log` on GOTD hit for build-log visibility
- `espnGotdKeysFromApi &&` guard in `assignMLBBroadcast` for defensive null safety

### Task 2: Wiring

Three changes:
1. `function assignMLBBroadcast(game, dateStr, rawBroadcasts, espnGotdKeysFromApi)` — added 4th param
2. ESPN GOTD block: added `structuralKey` variable + `espnGotdKeysFromApi.has(structuralKey)` OR branch
3. `function parseMLBFull(espnGotdKeys)` — added param, threaded to `assignMLBBroadcast` call
4. `main()`: `const espnGotdKeys = await fetchEspnMlbGotd(TODAY)` called once before `parseMLBFull`

Call site audit: confirmed `parseMLBFull` has exactly one caller (`main()`). `assignMLBBroadcast` has exactly one caller (inside `parseMLBFull`). No broken signatures.

---

## Task 3 — Verification

- `node --check scripts/build-field-data.js` → SYNTAX OK
- `site.api.espn.com` unreachable from CC sandbox (confirmed via proxy 403) — live API response verification not possible; this is a chat-side follow-up task per the CC-CMD spec
- No changes to existing function signatures that break other callers (both have single call sites, both updated)

---

## Task 4 — Outbox manifest

**(a) Peacock GOTD remains manual.** ESPN's `site.api.espn.com` has zero Peacock signal (confirmed in CC-CMD context: Tigers @ Yankees shows only `'MLB.TV'` — no Peacock entry). ESPN and Peacock are different companies with no shared broadcast feed. `PEACOCK_GOTD_SCHEDULE` / `PEACOCK_GOTD_IDS` stay as-is.

**(b) ESPN GOTD store proliferation — noted but NOT fixed.** Three separate ESPN-GOTD-related stores exist across the codebase:
- `ESPN_GOTD_LOOKUP` (build-field-data.js) — date-keyed away|home lookup, static, press-room sourced
- `ESPN_GOTD_IDS` (build-field-data.js) — env-var override, workflow_dispatch manual input
- `ESPN_GOTD_SCHEDULE` (index.html) — client-side fallback const in `loadMLBSlate()`

These are NOT consolidated here — that would be a separate "Rule 62 cleanup" CC-CMD. The proliferation is a real finding: three systems for one concept, each with a different key format and update mechanism. Flagged for future cleanup; out of scope here.

**(c) `site.api.espn.com` reachability from CC sandbox.** BLOCKED. Proxy returns 403. This CC-CMD was 100% chat-side for the API shape knowledge — field names corroborated via `parseESPNSoccer` (existing code that already uses the same hostname/field structure). Live verification of 'ESPN Unlmtd' broadcast name detection must happen via the next `field-data.yml` run on a day ESPN actually has a GOTD game.

---

## Chat-side follow-up (not checkable by CC)

Trigger `field-data.yml` (no manual `espn_gotd` input — let it run on auto-detect) on the next day ESPN actually has a GOTD game. Confirm `field-data-today.json` shows `espnGOTD: true` for the correct game with zero manual intervention. Today (2026-07-01) has no ESPN GOTD per earlier press-release check, so today's run is not a valid test case.

---

## Done Conditions

- [x] `fetchEspnMlbGotd(dateStr)` added — `https.request()` style, returns `Promise<Set>`
- [x] `assignMLBBroadcast` accepts `espnGotdKeysFromApi` as 4th param, used in GOTD detection
- [x] `parseMLBFull(espnGotdKeys)` threads Set from `main()` to `assignMLBBroadcast`
- [x] `fetchEspnMlbGotd` called exactly once in `main()` (not once per game)
- [x] `node --check` syntax clean
- [x] No broken call sites (both functions have single callers, both updated)
- [x] Committed (1780803), pushed to main
- [x] Outbox written
