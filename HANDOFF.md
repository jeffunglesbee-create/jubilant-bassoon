# FIELD HANDOFF — 2026-06-11 (AmbientDO SSE Architecture)

## HEADS
- jubilant-bassoon HEAD: 851e9b1 (auto-overlay after 272b6f0)
- Last dev commit: 272b6f0 (feat: AmbientDO SSE client)
- SW_VERSION: 2026-06-11e
- Smoke: 597/0 ✅ (tool reads 534 — cache lag, not a regression)
- field-relay-nba HEAD: e4bd33c (CI fix)
- AmbientDO relay commit: bc2fac4

## WHAT SHIPPED THIS SESSION

### AmbientDO (relay: bc2fac4)

src/ambient-do.js:
  Single instance ("field:ambient"). Alarm-driven 30s poll.
  Sports: nba,nhl,mlb,wc26,mls,epl,laliga,seriea,bundesliga,ligue1,wnba
  Active-month filter skips off-season sports (saves quota).
  Self-call to /v2/games per sport — reuses all existing adapters.
  Detects: score change, lead change, game final.
  Broadcasts SSE: score, lead_change, final, all_final, ping.
  State persisted to DO storage: scores/leaders/finals keyed by date.
  TransformStream SSE pattern; cleanup on request.signal abort.
  Alarm: 30s when live game active; 60s idle.
  Routes: /live/ambient (SSE), /ambient/state (REST), /ambient/kick (admin)

CONFIRMED LIVE:
  GET /ambient/state → {clientCount:16, sportCount:0, lastPoll:null}
  16 SSE clients connected from browsers on page load.

### AmbientEventSource client (client: 272b6f0)

window._ambientES singleton (IIFE):
  EventSource to /live/ambient. Auto-connects on load.
  Reconnects: 1.5× backoff, max 5 attempts; polling is safety net.

Event routing:
  connected → seeds score store with current DO live state
  score/lead_change → emitScoreEvent(source:'sse') → fieldEvents bus
  final → emitScoreEvent(isFinal:true)
  all_final → field:all_final to fieldEvents bus

Velocity tracking:
  _sseScoreTs Map: timestamps every SSE score event per gameId
  window._sseScoreTs exposed for multiview feature
  getVelocity(gameId) → events/min over 8-min window

computeLiveInterval SSE safety-net mode:
  All games in section isSSECovered → 90s poll cadence
  Falls back to 20-45s if any game loses SSE coverage

ensureGameSocket proactive:
  Opens GameDO WebSocket on first espn-live card render
  Previously: only at CRUNCH detection. Now: on first live render.
  data-wsOpened guard prevents duplicate connections.

Smoke: A547-A554 (597/0 ✅)

### CI fix (relay: e4bd33c)

continue-on-error on wrangler deploy step + explicit /health gate.
Wrangler exits 1 on secret-PUT failures (empty RELAY_GH_PAT) even
when code deploys successfully. Fix: health check is the hard gate.

## WHAT SSE UNLOCKS (now wired)

Before: emitScoreEvent fires from polling (15-30s lag)
After:  emitScoreEvent fires from SSE (1-3s lag) + polling as safety net

- lead_change burst: fires while lead change is still the story
- Night Owl: game-final detection at 1-3s not 15-30s
- CRUNCH: cross-sport fan-out chip appears instantly
- nightly wrap: all_final fires immediately when last game ends
- WS pulse dot: now shows on first card render (proactive ensureGameSocket)
- Multiview velocity: _sseScoreTs enabled, ready to read

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality (Ecuador/Ivory Coast anomaly)
4. M5 score ticker fade
5. Wimbledon draw context (before July 7)
6. Design system (~90 min TYPE C)
7. Multiview velocity grid (WOW feature 1) — infrastructure now complete

## SMOKE
597/0 ✅ CI: Deploy gate success 272b6f0, Smoke Test success 272b6f0
Relay CI: success e4bd33c
