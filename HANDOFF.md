# FIELD HANDOFF — 2026-06-10 (R2 surfaces wired)

## HEADS
- jubilant-bassoon HEAD: 27db136
- SW_VERSION: 2026-06-10a
- Smoke: 555/0
- field-relay-nba HEAD: e9a282d

## WHAT SHIPPED (27db136)

### Three journalism surface gaps closed

Diagnosis from "where do R2 items surface?":
  NHL series stats: loaded but [PP/PK] tag still used season stats.
  NHL GSAX: loaded but [GOALIE DUEL/EDGE] still used save% only.
  NBA clutch DRTG: loaded but never read by getNBAAnalyticsContext.

Fix 1 — getNHLAnalyticsContext now uses getNHLEffectiveST (series-adjusted):
  [PP/PK] tag: "CAR 93.5% PK% (series)" not pre-SCF entry rate.
  [PDO] tag ADDED: fires when series PDO > 1.010 or < 0.990.
    "VGK PDO 0.981 — running cold, due for improvement"

Fix 2 — [GOALIE DUEL/EDGE] appends GSAX from MoneyPuck R2:
  "[GOALIE DUEL] Andersen .923 · Hart .924 · GSAX: +3.1 / +1.8"
  "[GOALIE EDGE] Andersen — .923 sv% · GSAX +3.1 this playoff run"
  Falls back to save% only when GSAX unavailable.

Fix 3 — [TEAM CLUTCH] tag ADDED to getNBAAnalyticsContext:
  Reads clutchDrtg from NBA_TEAM_ANALYTICS (filled by nbaCluichInit).
  Fires: elite team clutchDrtg <= 108, or gap >= 5 between teams.
  "[TEAM CLUTCH] NYK 102.0 DRTG in clutch — elite late-game defense."

## FULL R2 SURFACE MAP (all items now wired)

| Data | Surfaces in |
|------|------------|
| NHL series PP%/PK% | Scout's Pick badge + [PP/PK] journalism tag |
| NHL series PDO | [PDO] journalism tag (NEW) |
| NHL GSAX | [GOALIE DUEL/EDGE] journalism tags |
| NBA clutch DRTG | [TEAM CLUTCH] journalism tag (NEW) |
| FBref soccer xG | [SOCCER ANALYTICS] in buildCompoundPrompt |
| MLB stats (mlbStatsInit) | Scout's Pick badge, umpire badge, pitch arsenal context |
| nflverse | Not yet wired — September use case |

## WHAT EACH R2 ITEM NOW PRODUCES FOR THE USER

NHL series stats → pre-game journalism shows current-series rates not entry rates.
  Before: "[PP/PK] VGK 23.9% PP | PK: CAR 93.5%"  (pre-SCF entry, potentially stale)
  After:  "[PP/PK] VGK 22.1% PP (series) | PK: CAR 91.7% (series)"

NHL PDO → new luck signal in journalism.
  "[PDO] VGK PDO 0.981 — running cold, due for improvement"
  Fires only when series window exceeds ±0.010 from baseline.

NHL GSAX → goalie journalism now cites true GSAX not save% proxy.
  "[GOALIE DUEL] Both elite: Andersen .923 · Hart .924 · GSAX: +3.1 / +1.8"

NBA clutch DRTG → new late-game defense signal in Finals journalism.
  "[TEAM CLUTCH] NYK 102.0 DRTG in clutch — elite late-game defense."
  Fires when first R2 run completes (dispatched June 10).

Soccer xG → EPL/WC journalism includes xG context.
  "[SOCCER ANALYTICS] Arsenal: xG 2.1/game, xGA 0.9/game | xGDivergence +0.42"

## SMOKE
555/0

## SESSION DOCS
Drive 1L5QCzn4dWvUwZP8forvpX-CxHyzagc-5
