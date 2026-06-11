# FIELD HANDOFF — 2026-06-11 (WC Tournament Projections Engine)

## HEADS
- jubilant-bassoon HEAD: e78dc3d
- SW_VERSION: 2026-06-11b
- Smoke: 575/0
- field-relay-nba HEAD: 63cb2ae

## WHAT SHIPPED THIS SESSION

### WC Tournament Projections Engine (relay: 63cb2ae, client: e78dc3d)

Replaces static conditional bracket with a live Monte Carlo tournament
path probability engine. For each of 48 teams: pR32, pR16, pQF, pSF,
pFinal, pChamp — computed from current group standings + remaining fixture
odds + Poisson knockout simulation.

**Relay (src/wc-tournament-projections.js, 540 lines):**
- `computeTournamentProjections({standings, remainingFixtures, oddsProbs, N=2000})`
  - Derives attack/defense strengths from group-stage Poisson lambdas
  - Auto-builds remainingFixtures from oddsProbs when not provided
  - N=2000 Monte Carlo: complete group stage → best 8 3rd → knockout rounds
  - ODDS_NAME_ALIAS map handles Odds API vs WC_TEAM_CONTEXT name mismatches
    ('Czech Republic'→'Czechia', 'Bosnia & Herzegovina'→'Bosnia and Herzegovina', etc.)
- `computeMovers(prev, curr, teamsPlayedToday)` — daily diff
  - gainers, losers: teams that played and changed
  - secondaryBeneficiaries, secondaryLosers: teams that shifted WITHOUT playing
    (path opened/closed because of results elsewhere in the bracket)
- `buildMoversBriefPrompt(movers, projections)` — 3-para journalism brief prompt

**Relay routes (all live):**
- GET  /wc/projections          — 48-team path probabilities (KV, 5min cache)
- GET  /wc/movers               — today's movers (KV, 24h TTL)
- GET  /wc/brief/tournament     — journalism brief from Claude (KV, 24h TTL)
- POST /wc/projections/refresh  — manual trigger

**Cron:** every 15 min during WC window (June 11–July 19).
Rotates curr→prev in KV for daily mover diff. Triggers journalism
brief via Claude when any team's pFinal moved >3%.

**Client (renderWCTournamentBracket, async):**
1. Journalism brief (gold left-border card, "Tournament Outlook")
2. Movers section: ↑/↓ arrows with delta%, "did not play" for secondary beneficiaries
3. 48-team probability table: Team | Grp | R32 | R16 | QF | SF | Final | Win
   Color-coded: green ≥50%, gold ≥15%, smoke <15%
4. Falls back to conditional R32 matchup view if projections unavailable

**Known issue:** First relay computation (before bug fix deployed) produced
all-zero probabilities due to name mismatch bug. The fixed code (63cb2ae)
will recompute on the next cron tick. The client shows correct structure
and will populate with real probabilities once the next cron runs.

### Earlier this session (carried forward)

**WC Live Conditional Bracket (05eed4a)**
Groups | ⚡ Bracket sub-tabs. Bracket shows R32 matchups as they'd form now.
Retained as fallback view when projections unavailable.

**UserDO Architecture (61d309f + 1897128)**
UUID-keyed DO, no PII. watchHistory + seriesLedger + dramaticMomentsMissed.
Wired into openBottomSheet() + mvAdd() + visibilitychange.

## PRIORITY LIST

1. WC projections first real data — verify after next cron (15-min cycle)
2. Series dots 6a            ← both NBA Finals + SCF still live
3. Arc sparkline GLYPH 6b   ← pair with 6a
4. WHOLE FIELD toggle 6c
5. State transition 6e
6. Drama spectrum 6f
7. M5 score ticker fade (assess severity)
8. Wimbledon draw context   (before July 7)
9. Design system (~90 min TYPE C)

## RELAY HEADS
- wc-tournament-projections.js: 63cb2ae (June 11 2026)
- user-do.js: 61d309f (June 11 2026)
- soccer-wp.js + wc-team-context.js: unchanged

## SMOKE
575/0
