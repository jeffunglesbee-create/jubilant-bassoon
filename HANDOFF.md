# FIELD HANDOFF — 2026-06-06 (Session END — PM-30 NBA Live Boxscore)

## State
jubilant-bassoon HEAD: 5f18604 · Smoke: 511/0 · Unit: 66/0
field-relay-nba HEAD: 981d474

## PM-30 — NBA Live Boxscore Optimizations — COMPLETE ✅

Live probe of NYK@SAS NBA Finals G2 (0042500402) confirmed CDN boxscore
delivers 33 per-player stats, oncourt flag, live stint +/-, officials.

### Gap 6 — gameLeaders from scoreboard (zero cost)
parseNBAScoreboardGames() now extracts gameLeaders → _nbaScoreLeaders[gameId].
buildNBAScoreLeadersContext(nbaId) → [LEADERS] tag.
Cost: 0 extra fetches (scoreboard already polled 30-60s).

### Gap 4 — fetchNBALiveBoxscore() periodic poll
Fetches CDN /liveData/boxscore/boxscore_{id}.json on 90s cadence.
Wired into buildCompoundPrompt parallel prefetch (Promise.allSettled).
Writes to _nbaLiveBoxscoreCache[gameId].

### Gap 1 — RAI Tier 0: oncourt flag
fetchRosterAdvantage() now checks _nbaLiveBoxscoreCache first (Tier 0).
Reads p.oncourt === "1" directly — eliminates fragile tricode matching.
Tier 1 (PBP sub-event) only fires if Tier 0 cache empty.

### Gap 2 — Live stint +/- blend in RAI quality
For on-court players: qMap[name] = 0.4×live plusMinusPoints + 0.6×season +/-.
Season average anchors small samples; live stint captures hot/cold unit now.

### Gap 3 — buildFoulTroubleContext() — [FOUL TROUBLE] tag
RUWT: foul count is a named observable fact (NBA rule threshold, not FIELD score).
Threshold: starters ≥3 fouls in Q1-Q2 (risk of sitting), ≥4 in Q3+.
Injected into compound prompt + Night Owl _owlStatCtx for NBA games.
Tonight: Wembanyama 1 foul early Q1 (below threshold, not triggered).

### Gap 5 — [OFFICIALS] tag
CDN game.officials[] → names in compound + Night Owl.
Tonight: Tony Brothers / Josh Tiven / Tyler Ford.

### RUWT compliance
All six signals are named observable facts:
- oncourt: binary (physically on the court)
- plusMinusPoints: factual score differential while on court
- foulsPersonal: foul count (mirroring NBA rule thresholds)
- officials: identity (who is officiating)
- gameLeaders: top scorer (factual stat)
None are composite interest/excitement scores. No RUWT exposure.

## Key architectural notes for next session
- fetchNBALiveBoxscore uses RELAY_BASE not NBA_CDN_RELAY (same host, same proxy)
- _nbaLiveBoxscoreCache keyed by NBA 10-digit game ID (same as _nbaGameIdMap values)
- Tier 0 ID lookup: uses _nbaGameIdMap[hNick_aNick] — requires fetchNBAScoreboard() to have run first
- Live boxscore: 405 on HEAD request (CORS probe quirk) but GET returns 200. CDN delivers full player array including bench players.

## Priority List
1. JQ Gate brand-safe fallback (~60 lines)
2. Drama Dial header chip (~20 lines)
3. Arc Poster (~200 lines)
4. State Transition PerformanceObserver (~30 lines)
5. fetchAFGoalEvents() — populate _afEventCache for soccer goal timeline

## Key Refs
jubilant-bassoon HEAD: 5f18604
field-relay-nba HEAD: 981d474
Smoke: 511/0 · Unit: 66/0
