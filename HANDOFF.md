# FIELD HANDOFF — 2026-06-11 (BracketDO + Ambient Fix)

## HEADS
- jubilant-bassoon HEAD: 40cc3e5 (auto-overlay after e7a4ab7)
- Last dev commit: e7a4ab7 (fix: ambient panel hidden in wc-mode at all viewports)
- SW_VERSION: 2026-06-11c
- Smoke: 584/0 ✅ (tool reads 521 — cache lag, not a regression)
- field-relay-nba HEAD: 4fa945f

## WHAT SHIPPED THIS SESSION

### BracketDO (relay: 4fa945f)

Single DO instance ("wc2026") for full WC tournament. Receives result
pushes from writeWCResult() after every confirmed final — recomputes
Monte Carlo projections, persists snapshot + delta, fans out to
WebSocket clients, queues journalism brief on significant shifts (≥5pp).

**bracket-do.js:**
  - POST /bracket/result: dedup → fetch standings → computeTournamentProjections (N=2000)
    → compute delta (pChampion/pAdvance shifts per team) → persist DO storage
    → update KV (wc:projections:current, wc:bracket:current)
    → WS fan-out {type:'bracket:updated', delta, trigger}
    → queue JOURNALISM_QUEUE if significant (champDelta ≥ 5pp)
  - GET /wc/bracket/live: WebSocket upgrade — delivers bracket:current on connect
  - GET /wc/bracket/state: REST poll fallback
  - POST /wc/bracket/refresh: admin recompute trigger
  - ADR-002/RUWT: probability facts only, no drama scores

**index.js changes:**
  - BracketDO import + export
  - writeWCResult(db, game, env): env added; BracketDO notified fire-and-forget
  - Routes: /wc/bracket/live, /wc/bracket/state, /wc/bracket/refresh
  - Probe allowlist: /wc/bracket/state
  - Health: bracket-do added

**wrangler.toml:** BRACKET_DO binding + v3-bracket-do migration

Probe: GET /wc/bracket/state → {snapshot:null, delta:null, resultCount:0} 200 OK

### Ambient Panel Fix (client: e7a4ab7)

body.wc-mode #ambient-panel{display:none !important} moved out of
@media(max-width:1199px) — now suppresses at ALL viewport widths.
Desktop wc-mode margin resets added at 1200px+ for nav/masthead/.main.

## ARCHITECTURE: DO write path

api-sports poll detects status=FT
  → writeWCResult: D1 INSERT OR IGNORE + recomputeGroupStandings
  → notify BracketDO (async, fire-and-forget)
  → BracketDO: fetch standings, Monte Carlo, update KV, fan-out WS
  Total latency: ~3-5s after final whistle (next poll cycle)

Hourly cron (runWCTournamentProjections) remains as safety net.
BracketDO is the fast path — supersedes cron during live games.

## NEXT SESSION: State transition 6e

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality — Ecuador/Ivory Coast ranking anomalously high
4. M5 score ticker fade
5. Client-side /wc/bracket/live WS wire-up (auto-refresh on bracket:updated)
6. Wimbledon draw context (before July 7)
7. Design system (~90 min TYPE C)

## SMOKE
584/0 ✅ CI green at e7a4ab7 (deploy gate + Smoke Test + Live Verify both pass)
