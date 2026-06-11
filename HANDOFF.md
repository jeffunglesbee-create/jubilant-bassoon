# FIELD HANDOFF — 2026-06-11 (BracketDO WS client + verification)

## HEADS
- jubilant-bassoon HEAD: 4a8ab46 (auto-overlay after 422bcaa)
- Last dev commit: 422bcaa (feat: BracketDO WS client)
- SW_VERSION: 2026-06-11d
- Smoke: 589/0 ✅
- field-relay-nba HEAD: 4fa945f (BracketDO — unchanged this session)

## VERIFIED THIS SESSION

All items interrupted by prior tool-call limits confirmed good:

| Item | Status |
|---|---|
| 6b arc sparkline | ✅ buildSeriesMarginsArc correct — NBA #34d399, SCF green |
| 6c WHOLE FIELD toggle | ✅ A533-A536 pass, CSS confirmed |
| Ambient panel fix | ✅ global hide rule + desktop margin resets present |
| BracketDO relay | ✅ live 4fa945f, /wc/bracket/state 200, health confirmed |

## WHAT SHIPPED: Item 5 — BracketDO WS client (client: 422bcaa)

window._bracketWS singleton (IIFE, injected before renderWCSection):
  - Connects to wss://.../wc/bracket/live when renderWCSection() runs
  - Closes cleanly when toggleWCView() deactivates WC mode
  - Reconnects on unexpected close: max 3 attempts, 3s×attempt backoff
  - 45s ping/pong keepalive (CF DO idle timeout 60s)

On bracket:updated or bracket:current received:
  - Bracket tab active → renderWCBracketTree (wide) or
    renderWCTournamentBracket (narrow)
  - Groups tab active → full renderWCSection()
  - significant delta (≥5pp) → bracket button title = narrative seed

Visual:
  - .bracket-live on Projections button while WS connected
  - Pulsing green dot via ::after + bracketPulse @keyframes

Smoke: A542-A546 added (589/0 ✅)

## FULL DATA FLOW (now complete end-to-end)

api-sports poll → status=FT detected
  → writeWCResult: D1 write + recomputeGroupStandings
  → BracketDO.fetch POST /bracket/result (fire-and-forget)
    → Monte Carlo recompute (N=2000)
    → KV updated (wc:projections:current, wc:bracket:current)
    → WS fan-out {type:'bracket:updated', delta}
      → client _bracketWS receives message
        → re-renders bracket or groups tab automatically
        → if significant: journalism brief queued

Total latency from final whistle: ~3-5s (next api-sports poll cycle)

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality — Ecuador/Ivory Coast ranking anomalously high
4. M5 score ticker fade
5. Wimbledon draw context (before July 7)
6. Design system (~90 min TYPE C)

## SMOKE
589/0 ✅ CI green at 422bcaa (deploy gate + Smoke Test + Live Verify)
