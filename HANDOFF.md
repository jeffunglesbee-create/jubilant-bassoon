# FIELD HANDOFF — 2026-06-05 (Session END — PM-28 partial)

## State
jubilant-bassoon HEAD: 992c20d · Smoke: 508/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a

## PM-28 Build Status

### SHIPPED this session (992c20d)

**PM-28a** — `recordLinescores()` + `getLinescores()` + `LINESCORE_KEY`
  Persists homeLinescores/awayLinescores to localStorage on each period
  boundary. Schema: `{h,a,sport,periods,t,innings[]}`. Guard: only writes
  when `homeLS.length > stored.periods`. Auto-pruned by existing midnight
  prune via `.t` field. Location: ~line 26348 (near `SCORE_SNAP_KEY`).

**PM-28b** — Extract `linescore.innings[]` in `normalizeMLBGame()`
  `g.linescore.innings[]` was hydrated via `hydrate=linescore` but never
  read. Added extraction of `{n,hr,hh,he,ar,ah,ae}` per inning.
  Fixes `eData.innings` always being `[]` — unblocks no-hitter check
  (~line 18149) and late-comeback check (~line 18169).

**PM-28c** — Wire `recordLinescores()` at `recordScoreSnapshot` callsite
  Fires alongside `recordScoreSnapshot` at line 26118. Passes
  `eData.homeLinescores`, `awayLinescores`, `_sport`, `innings`. Noop
  if `homeLinescores` absent.

**FIELD_FEATURES** — 10 pm28 entries declared.

### PENDING (next session resumes here)

| Item | What | Key refs |
|------|------|----------|
| PM-28d | NBA CDN boxscore → quarter scores + player stats | `fetchNBABoxScoreViaRelay()` line 13885 (zero callsites). CDN schema: `game.homeTeam.periods[{period,score}]`. Trigger: `checkForNewFinals()` line 28933. Write into `espnScores[key].homeLinescores` + `_nbaBoxscoreCache[gameId]`. |
| PM-28e | NHL `fetchNHLLiveStats()` → extract `byPeriod` goals | `bd.linescore.byPeriod[{periodDescriptor,away,home}]` inside existing boxscore fetch (line 13696). Insert extraction in same try-block. Write into `espnScores[key].homeLinescores/awayLinescores`. key = `${home}\|${away}` set at line 13737. |
| PM-28f | `buildLinescoreContext()` formatter | Insert near `recordLinescores()`. Live: `eData.homeLinescores`. Postgame: `getLinescores(gameId)`. Labels: NBA Q1-Q4, NHL P1-P3, MLB Inn1-9 (H/R/E format), Soccer 1H/2H. Output: `[LINE SCORE] Q1: 28-26 \| Q2: 22-29...`. Guard: <2 periods → `''`. |
| PM-28g | `buildGoalTimeline()` soccer | FD path: `_fdGoalCache["{home}\|{away}"]` + `htHome/htAway`. API-Football path: `/apisports/football/fixtures/events?fixture={_gameId}` via V2_RELAY_BASE. Cache in `_afEventCache[gameId]`. Output: `[GOAL TIMELINE] 23' Arsenal/Saka (Odegaard) · 67' Chelsea/Palmer [HT: 1-0]`. |
| PM-28h | `buildNBAPlayerContext()` | Source: `_nbaBoxscoreCache` (from PM-28d). Top 2 per team by pts. Output: `[NBA BOX] Brunson 32pts/7ast · KAT 24pts/11reb (NYK)`. |
| PM-28i | `normalizeApiFootballStats()` adapter | Input: `[{team:{name}, statistics:[{type,value}]}]` → `{"Arsenal":{"Yellow Cards":2,...}}`. ~15 lines. |
| PM-28j | Inject into `fetchNightOwlFromClaude()` | ~line 27575. Add `_lineCtx`, `_goalCtx`, `_nbaCtx` to prompt. Update DO NOT FABRICATE rule to scope to absent data. |
| PM-28k | Inject into `buildCompoundPrompt()` | After `extremeNote` at ~line 20518. Add `buildLinescoreContext()` + `buildGoalTimeline()` per game. |
| PM-28l | Inject `_nhlLiveStatsCache` into Night Owl | Already reaches compound (line 20538). ~3 lines to add to Night Owl prompt. |
| PM-28m | Midnight prune verify | `field_linescore_` auto-pruned by existing `.t` check. Verify only — no new code. |
| PM-28n | Smoke assertion A500 | Check: recordLinescores, getLinescores, LINESCORE_KEY, buildLinescoreContext, buildGoalTimeline, buildNBAPlayerContext, normalizeApiFootballStats, innings[] in normalizeMLBGame, Night Owl injection, compound injection. |

## Key Do Not Assume Facts for Next Session

- `fetchNBABoxScoreViaRelay()` is defined (line 13885), never called
- `_nbaGameIdMap` key format: `"{hNick}_{aNick}"` e.g. `"spurs_thunder"`
- `_fdGoalCache` written at line 11055, zero reads anywhere
- `htHome/htAway` on FD match objects, not in any prompt
- API-Football `/fixtures/events` returns goals+assists+cards+subs free tier
- `_nhlLiveStatsCache[key]` in compound (line 20538), NOT in Night Owl
- `normalizeApiFootballStats()` needed: AF stats is array-of-objects schema, different from every other FIELD source
- `FIELD_V2_SOURCES.mls = true` (wc26 = false, epl/ucl = false — season paused)
- Existing midnight prune handles `field_linescore_` automatically via `.t` field

## Priority List

### Time-gated (this week)
1. **WC pre-flight** — probe all relay endpoints before June 11 opener
   MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
   D1 wc2026: `f26669de-e772-4b56-a6d1-f8fdea08a4d4`
2. **BALLDONTLIE trial** — June 11 opening match data source test

### After PM-28 complete
3. JQ Gate brand-safe fallback (~60 lines)
4. Drama Dial header chip (~20 lines)
5. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
6. State Transition PerformanceObserver (~30 lines)
7. iOS PWA Add-to-Home (~40 lines)

## Key Refs
jubilant-bassoon HEAD: 992c20d
field-relay-nba HEAD: 25d8fbc
PM-28 spec v3: 1k6ezaT8y7r1Q9gmRMOCxMARFKAp7Thta
Session doc: 1RoJuUKdgTFVb_X6RlfXDqynV-tSDcNbK
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 508/0 · Unit: 66/0
