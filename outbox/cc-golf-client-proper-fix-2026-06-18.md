CLIENT — Golf Proper Fix (band-aid removal)
Built on: relay CC a2df1e4 + client CC 17721de (cherry-picked as db0d7d0)

REMOVED:
- loadPGASlate normalization layer (Rule 64 — relay returns canonical shape)
- loadPGASlate date conversion (Rule 64 — relay accepts YYYY-MM-DD)
- Auto-create Golf section hack (Rule 64 — slashGolfPrefetchAll backfill handles this)
- eventName → name fallback (Rule 64 — relay returns canonical `name`)
- pos → position fallback (Rule 64 — relay returns canonical `position`)

PRESERVED:
- computeGolfDerivedMetrics (relocated to standalone function; reads canonical names directly)
- buildGolfPromptContext (already reads canonical field names, no changes needed)
- injectPGALeaderboard (already reads canonical field names, no changes needed)
- slashGolfPrefetchAll step 2b backfill (A649) — single owner of Golf section creation
- estimated-SG engine math (ballStriking, sgPuttingEst, sgApproachEst, sgOTTEst, momentum)

INTEGRATION STATUS: VERIFIED via CI-as-proxy probe
- File: outbox/golf-contract-result-20260618T144721Z.txt
- All 6 assertions PASSED (top-level name, position not pos, stats object, stats.gir, stats.drivingDistance, no flat driveDistAvg)
- Sample: U.S. Open active, leaderboard 156 entrants pre-round-1

CONTRACT (per Rule 65):
- RELAY ENDPOINT: GET https://field-relay-nba.jeffunglesbee.workers.dev/v2/golf/enriched?date=YYYY-MM-DD
  Accepts YYYY-MM-DD or YYYYMMDD. Cache TTL relay-side per relay contract doc.
- RESPONSE SHAPE:
  { name: string, active: bool, leaderboard: [
    { athleteId, name, position, toPar, today, thru, round, rounds[],
      stats: { gir, drivingDistance, drivingAccuracy, puttsPerGir, sandSaves } }
  ] }
- CLIENT CONSUMER:
  - loadPGASlate() — fetches, caches in sessionStorage[`pga:${today}`] for 10 min
  - computeGolfDerivedMetrics(data) — mutates data with _fieldAvg + per-row _derived
  - injectPGALeaderboard(d) — DOM render under .golf-leaderboard strip
  - buildGolfPromptContext(d) — journalism prompt context (reads stats + _derived)
- KNOWN MISMATCHES: none. Client consumes relay output as-is.

WHAT NOT TOUCHED:
- Relay code (the contract is right; band-aids were on the client)
- buildSlashGolfGamesForToday wiring (already shipped in 17721de / db0d7d0)
- Smoke A649 (still valid; new A650 covers the band-aid removal)

SMOKE: 689 → 690 / 0 (A650 added)
SW_VERSION: 2026-06-18a → 2026-06-18b
