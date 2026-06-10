# FIELD HANDOFF — 2026-06-10 (ADR-002 R2 Addendum)

## HEADS
- jubilant-bassoon HEAD: ad360af
- SW_VERSION: 2026-06-10a
- Smoke: 557/0
- field-relay-nba HEAD: e9a282d

## SESSION TYPE
TYPE D (Patent analysis + documentation)

## WHAT SHIPPED (ad360af)

### ADR-002 R2 Storage Addendum
.github/adr/ADR-002-r2-addendum.md committed.
Drive: 1C0Cw4w7Rx4kHqdQhy-mDN3mJK398DbWP

#### Finding
R2 is NOT a RUWT concern under current usage.
  - R2 stores team performance statistics (PP%, GSAX, clutch DRTG, xG, etc.)
  - None are game-level interest ratings in the RUWT sense
  - Component 3 (push cron) never reads R2 — coupled pair does not form
  - R2 data flows only to journalism prompts + client-side chips (Component 2)

#### New Rule F (binding from this addendum)
"R2 STORES STATISTICS, NOT RATINGS."
  Test: 'Does this value answer how exciting is this game right now?'
  If yes → forbidden. If no → permitted.
  Component 3 must NEVER read from R2. Unconditional.

#### PDO edge case analyzed
Clean: team-level, computed from historical data, never in push path.
'Running hot/cold' label is generated client-side (_buildAnalyticsChips).
The relay stores only the raw PDO number.

#### Rule C clarification for R2
Component 1 reading Component 1's own R2 derived storage: PERMITTED.
Component 3 reading R2 regardless of content: FORBIDDEN.

## ADR-002 FULL RULE SET (as of June 10 2026)

Rule A: Relay generates prose only. No game classifications or interest values.
Rule B: Classification is client-side, always.
Rule C: No component reads another component's derived output.
Rule D: Push checker uses standalone boolean only.
Rule E: No SSR of drama state (client-rendered PWA is a compliance requirement).
Rule F: R2 stores statistics, not ratings. Component 3 never reads R2. [NEW]

## OPEN ITEMS
ADR-002: PROPOSED. Pending attorney review + Jeff approval.
Split-operations question (post-game server-side scoring): unresolved.
Wimbledon draw context: ~25 min TYPE A, before July 7
WC bracket: ~June 18-20
Product spec surfaces 6a-6f

## SMOKE
557/0

## SESSION DOCS
ADR-002 R2 Addendum: Drive 1C0Cw4w7Rx4kHqdQhy-mDN3mJK398DbWP
Prior ADR-002 Continuation Addendum: Drive 1zTM69EnF9F5zljkBD-sGVmfl2Az1ys_2
