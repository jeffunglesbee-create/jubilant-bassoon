# CC Session — Drama Gateway (getDramaGateway)
**Date:** 2026-07-16
**Repo:** jubilant-bassoon
**HEAD:** c9505a9
**SW_VERSION:** 2026-07-16e → 2026-07-16f
**Smoke:** 954 → 958 (4 new assertions, 0 failed)

## Commits

| Hash | Summary |
|------|---------|
| c9505a9 | feat(drama): add getDramaGateway + wire into injectDramaBadges + renderOneToWatch |

## What was built

`getDramaGateway(game, sport)` — structural access point for drama data, keyed on game state.

**Routing logic:**
- `state==='post'|'final'` → `{mode:'score', value, arc, peak}` — numeric drama only exits here. Reads `getDramaPeakWithTime`, `getDramaSustained`, `_dramaArcClassify` for real arc classification.
- `state==='in'|'live'` → `{mode:'observation', value: named condition}` — never a raw number. Named states: CRUNCH_TIME (isCrunchTimeGame), CLOSE_FINISH (isLateCloseGame), BLOWOUT (final period + margin>24), IN_PROGRESS (default).
- `state==='pre'` or unknown → `{mode:'observation', value: named condition}`. Named states: MARQUEE (isMarqueeBroadcast), SCOUTS_PICK (isScoutsPick), STANDARD (default).

**Wired into:**
- `injectDramaBadges` (line ~38874): `const _gwLive = getDramaGateway(game, sport); if (_gwLive.mode !== 'observation') return;`
- `renderOneToWatch` (line ~39604): `const _gwOTW = getDramaGateway(g, sport); if (_gwOTW.mode !== 'observation') return;`

**Smoke assertions added:**
- A-DRAMA-GATEWAY-1: function definition exists
- A-DRAMA-GATEWAY-2: all 8 named states present (mode:'score' + mode:'observation' + 7 value constants)
- A-DRAMA-GATEWAY-3: wired into both proof-of-concept sites
- A-DRAMA-GATEWAY-4: pre-game branch uses isMarqueeBroadcast + isScoutsPick (no dramaScoreLive in pre/live)

## TASK 0 Probe findings

Helpers confirmed existing: isScoutsPick (10270), isMarqueeBroadcast (22602), isLateCloseGame (37312), isCrunchTimeGame (40429, not isCrunchTime), getDramaHistory (36922), getDramaPeakWithTime (36961), getDramaSustained (36952), _dramaArcClassify (36989).

`isGarbageTime` — does NOT exist as a function; inline garbage-time logic only in injectDramaBadges lines 38889–38902. Gateway replicates it with: final period detection per sport + margin > 24 → BLOWOUT.

State convention confirmed: 'pre'/'in'/'post' primary. 'live'/'final' also appear for WC26/V2 — both handled (isLive covers 'in'|'live', isPost covers 'post'|'final').

## Integration status

VERIFIED: getDramaGateway exists, smoke passes 958/958, 8 forced-condition tests pass.

Proof-of-concept wiring: VERIFIED (structural non-regression — guards only trigger for impossible cases: post-game card on .espn-live, post-game appearing in _otwFindLiveGame result). Visible output unchanged.

## Open carry-forwards

- 35 remaining ad-hoc state-check sites (not in scope of this CC-CMD per spec)
- 5 Amnesty Zone CC-CMDs (Arc Poster, Bottom Sheet, Card Face, Leaderboard) now have a real foundation
- docs/CC-CMD-2026-07-16-broadcast-chip-durable-fix.md — not yet executed
