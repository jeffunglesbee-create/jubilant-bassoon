# FIELD HANDOFF — 2026-06-06 (Session END FINAL — PM-31 Score Hardening + Scout's Pick + 4am Rollover)

## State
jubilant-bassoon HEAD: 7651100 · Smoke: 511/0
field-relay-nba HEAD: 981d474

## Session Docs
Part 1 — Score Hardening: Drive 1rD3Omg6SCkJHhA-OneVTiF-HXTIpvxjT
Part 2 — Scout's Pick + 4am Rollover: Drive 1vRKEjzlSdz854oqwuT1OAVUqhMsd7lYX

## Commits This Session (clean list)

7651100 feat: 4am ET rolling day cutoff + AFL AEST carveout in isToday()
600c6c7 feat: Scout's Pick brief + Night Owl verdict
685c923 feat: Scout's Pick into 3 missing surfaces (WatchWindow, DramaLine, RightNow)
7c53ee1 fix: buildScoreNarrativeContext finalMargin floor (4→10 for 13-3 game)
b148e59 fix: pre-overwrite guard — never overwrite live/final with pre-game entry
573b5cf fix: renderESPNScores updates .game-time every poll cycle
c86da0f harden: buildSafeScoreWrap() 4-layer defensive display
be89224 fix: hydrateEspnScoresFromFinals() — localStorage authoritative for finals
7062a22 fix: stale-final guard uses etDate OR utcDate; final stage shows score
4a42a9e fix: stale eData.state=post guard; 0-0 live stage slot
4947808 tier1: Gemini 4000 RPM recalibration

## Key Bugs Fixed

ROOT CAUSE of 0-0 on all live MLB (b148e59):
V2 returns both today's final AND tomorrow's pre-game for same teams.
forEach wrote pre-game (null) AFTER final (real scores). One guard fixed it:
  if (v2Entry.state==='pre' && prev && (prev.state==='in'||prev.state==='post')) return;

ROOT CAUSE of missing scores on finished ET games (7062a22):
Stale-final guard: gameUtcDate !== utcDate dropped 7pm ET games after midnight UTC.
Fix: allow if gameUtcDate === etDate OR gameUtcDate === utcDate.

ROOT CAUSE of .game-time never updating (573b5cf):
buildCardTimeDisplay baked at renderAll() with null eData. No update path existed.
Fixed in renderESPNScores: querySelector('.game-time') + update every poll cycle.

NOVEL FIX — hydrateEspnScoresFromFinals (be89224):
V2 reliably returns null for finished games. Stop fighting it.
localStorage tonight-finals (written by saveEspnFinal when score known) is authoritative.
Hydrate espnScores from localStorage before every render and every V2 poll.

DEFENSIVE FIX — buildSafeScoreWrap (c86da0f):
4-layer fallback: narrative → force-state retry → localStorage → raw numbers.
Score-wrap never blank for a card marked live or final.

## Scout's Pick Journalism

Brief: [SCOUT'S PICK] tag now in regularSection game lines → Gemini writes hidden-gem angle.
Verdict: isScoutsPick designation persisted to localStorage at badge time.
  Key: field_scout_pick_{game._id} | Value: {home, away, signal, t}
  Night Owl reads at game-end → [SCOUT'S PICK PREDICTION] context → grades delivery.

Surfaces wired (complete):
  Card badge + teal border (pre-game, cleared on go-live) ✓
  Desk Journal digest ✓
  FIELD Brief (J1) text line ✓
  Compound [SCOUT'S PICK] tag ✓
  Compound [FEATURED STAT] tag ✓
  scouts_pick response field ✓
  BNI exclusions ✓
  detectArcType → hidden-gem ✓
  buildWatchWindowReason chip ✓ (new)
  buildDramaLineTiers pre fallback ✓ (new)
  buildRightNowTiers series/pick chip ✓ (new)
  game_briefs [SCOUT'S PICK] tag in regularSection ✓ (new)
  Night Owl postgame verdict ✓ (new)

## 4am ET Rollover

TODAY_ISO: IIFE sets window.TODAY_ISO using ET with 4am cutoff.
  Before 4am ET: subtract 24h → stay on previous ET date.
  All downstream (viewingISO, goToDate, date labels, cache keys) correct automatically.

AFL carveout: isToday(iso, {isAFL:true}) uses Australia/Sydney timezone.
  Applied in refreshAFLSection() and injectSquiggleTips().
  Hardcoded AFL schedule data doesn't need it (already keyed by AEST round date).

## V2 Architecture Final State

datesToQuery: [etDate, utcDate] when they differ (covers full US evening slate)
Stale-final guard: skip if gameUtcDate !== date AND gameUtcDate !== etDate
Pre-overwrite guard: skip if v2Entry.state==='pre' && prev.state in ['in','post']
Score pipeline: fetchV2 → hydrateFromFinals → renderESPNScores → buildSafeScoreWrap + .game-time

## Open Items (Tuesday)
1. P0: Scoreboard panel verification (first broken NBA Finals G1)
2. P0: R2 Finals Narrative Context Phase 1
3. JQ Gate brand-safe fallback (~60 lines)
4. Drama Dial header chip (~20 lines)
5. Arc Poster SVG (~200 lines)
6. PerformanceObserver state transitions (~30 lines)
7. WC 2026 opens June 11 — auto-activation in place

## Key Refs
jubilant-bassoon HEAD: 7651100
field-relay-nba HEAD: 981d474
Smoke: 511/0 | Unit: 66/0
Weekly limit: 91% used, resets Tue 10am. Session resets ~3:50am Jun 6.
CI/Deploy: 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
Journalism Quality Spec: 1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
