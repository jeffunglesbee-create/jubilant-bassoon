# FIELD HANDOFF — 2026-06-05 (Session END — PM-28 COMPLETE)

## State
jubilant-bassoon HEAD: 3ae883d · Smoke: 509/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a

## PM-28 — COMPLETE ✅

All items a–n shipped in commit 3ae883d.

### What was built

**PM-28a** — `recordLinescores()` + `getLinescores()` + `LINESCORE_KEY` (prior session)
**PM-28b** — MLB `g.linescore.innings[]` extraction in `normalizeMLBGame()` (prior session)
**PM-28c** — `recordLinescores()` wired at `recordScoreSnapshot` callsite (prior session)
**PM-28d** — NBA CDN boxscore fetch in `checkForNewFinals()` → `_nbaBoxscoreCache`
  `fetchNBABoxScoreViaRelay(nbaId)` called on first 'post' detection for NBA games.
  Extracts `game.homeTeam/awayTeam.periods[{score}]` → `homeLinescores[]`.
  Extracts top-2 scorers per team from `players[{name,statistics:{points,rebounds,assists}}]`.
  Cache key: 10-digit NBA game ID from `_nbaGameIdMap`.
**PM-28e** — NHL `byPeriod` goals → `espnScores[key].homeLinescores/awayLinescores`
  Inside `fetchNHLLiveStats()` boxscore try-block, after goalie extraction.
  `bd.linescore.byPeriod[{home,away}]` → homeLS/awayLS arrays written directly to espnScores.
**PM-28f** — `buildLinescoreContext(eData, gameId)`
  Live path: `eData.homeLinescores`. Postgame: `getLinescores(gameId)`.
  Labels: NBA Q1-Q4, NHL P1-P3, MLB Inn1-9, Soccer 1H/2H/ET.
  Guard: `< 2 periods → ''`. Output: `[LINE SCORE] Q1: 28-26 | Q2: 22-29 ...`
**PM-28g** — `buildGoalTimeline(game, eData)` + `_afEventCache`
  FD path: `_fdGoalCache[key]`. AF path: `_afEventCache[gameId]`.
  Output: `[GOAL TIMELINE] 23' Arsenal/Saka (Odegaard) · 67' Chelsea/Palmer [HT: 1-0]`
**PM-28h** — `buildNBAPlayerContext(game, eData)`
  Reads `_nbaBoxscoreCache` via `_nbaGameIdMap` lookup.
  Output: `[NBA BOX] Brunson 32pts/7ast (Knicks) · KAT 24pts/11reb (Knicks)`
**PM-28i** — `normalizeApiFootballStats(raw)`
  Input: `[{team:{name}, statistics:[{type,value}]}]`
  Output: `{"Arsenal":{"Yellow Cards":2,...}}`
**PM-28j** — Night Owl `_owlStatCtx` injections: `[LINE SCORE]`, `[GOAL TIMELINE]`, `[NBA BOX]`
**PM-28k** — `buildCompoundPrompt()` injections after `extremeNote`: all three context builders
**PM-28l** — NHL `_nhlLiveStatsCache` injected into Night Owl `_owlStatCtx`
**PM-28m** — Midnight prune verified: `field_linescore_` auto-pruned by `.t` field — no new code
**PM-28n** — Smoke assertion A500 (509/0 passing)

### Key architectural facts for next session

- `_nbaBoxscoreCache[nbaId]` = `{homeLinescores, awayLinescores, homePlayers[], awayPlayers[], homeLabel, awayLabel, ts}`
  Populated asynchronously by `checkForNewFinals()` when NBA game hits 'post' state.
  nbaId is 10-digit string from `_nbaGameIdMap`.
- `_afEventCache[gameId]` declared, not yet populated. Population path: future `fetchAFGoalEvents()`.
  Schema: `[{time:{elapsed}, team:{name}, player:{name}, assist:{name}, type, detail}]`
- `buildLinescoreContext()` location: ~line 26423 (after `getLinescores()`)
- `buildGoalTimeline()` location: ~line 26481
- `buildNBAPlayerContext()` location: ~line 26517
- `normalizeApiFootballStats()` location: ~line 26548
- `recordScoreSnapshot()` follows immediately after `normalizeApiFootballStats()` — was accidentally
  orphaned during PM-28g insertion and repaired. Structure verified.
- Night Owl injection is inside the outer `try { ... } catch(e_) {}` block that wraps all
  `_owlStatCtx` builds. PM-28j/l each use their own inner try-catch.

## Priority List

### Time-gated (this week)
1. **WC pre-flight** — probe all relay endpoints before June 11 opener
   MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
   D1 wc2026: `f26669de-e772-4b56-a6d1-f8fdea08a4d4`
2. **BALLDONTLIE trial** — June 11 opening match data source test

### After PM-28 (now unblocked)
3. JQ Gate brand-safe fallback (~60 lines)
4. Drama Dial header chip (~20 lines)
5. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
6. State Transition PerformanceObserver (~30 lines)
7. iOS PWA Add-to-Home (~40 lines)
8. `fetchAFGoalEvents()` — populate `_afEventCache` from `/apisports/football/fixtures/events?fixture={_gameId}`

## Key Refs
jubilant-bassoon HEAD: 3ae883d
field-relay-nba HEAD: 25d8fbc
PM-28 spec v3: 1k6ezaT8y7r1Q9gmRMOCxMARFKAp7Thta
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 509/0 · Unit: 66/0
