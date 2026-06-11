# FIELD HANDOFF — 2026-06-11 (WC Tournament Projections Engine)

## HEADS
- jubilant-bassoon HEAD: e78dc3d
- SW_VERSION: 2026-06-11b
- Smoke: 575/0
- field-relay-nba HEAD: 6bfb501

## WHAT SHIPPED THIS SESSION

### WC Tournament Projections Engine (relay: 6bfb501, client: e78dc3d)

Live Monte Carlo tournament path probability engine for all 48 WC 2026 teams.
Replaces static conditional bracket with per-team pR32/pR16/pQF/pSF/pFinal/pChamp.

**Relay (src/wc-tournament-projections.js):**
- `computeTournamentProjections({standings, remainingFixtures, oddsProbs, N=2000})`
  - Derives team attack/defense strengths from group-stage Poisson lambdas
  - Auto-builds effectiveRemaining from oddsProbs when caller omits fixtures
  - N=2000 Monte Carlo: complete group stage → best 8 3rd → knockout rounds
  - ODDS_NAME_ALIAS: Czech Republic→Czechia, Bosnia & Herzegovina→Bosnia and Herzegovina,
    DR Congo→Congo DR, USA→United States, Turkey→Türkiye
  - simulateGroupStage registers teams from WC_TEAM_CONTEXT nameToGroup when
    standings empty (Day 1 fix)
  - Missing-fixture padding: teams with <3 group games padded toward tournament
    mean (Ecuador fix — Germany vs Ecuador not yet in Odds API)
  - poissonSample() for realistic goal simulation
- `computeMovers(prev, curr, teamsPlayedToday)` — daily diff
  - gainers, losers, secondaryBeneficiaries, secondaryLosers
  - Secondary = teams that shifted WITHOUT playing (path opened/closed elsewhere)
- `buildMoversBriefPrompt(movers, projections)` — 3-para Claude journalism prompt

**Bug fixes committed this session:**
- h2hLambdas formula was INVERTED: used BASE/B.defense (wrong) instead of
  B.defense/BASE (correct). Low-defense teams (France, Spain) were being treated
  as easier to score against. Ecuador ranked #1 due to this + missing fixture.
  Fixed: lA = A.attack × B.defense / BASE_LAMBDA
- USA→United States alias added (Odds API uses 'USA')
- Turkey→Türkiye alias added (Odds API uses 'Turkey')

**Relay routes (all live, in probe allowlist):**
- GET  /wc/projections          — 48-team path probs (auto-triggers compute if empty)
- GET  /wc/movers               — today's movers (24h TTL)
- GET  /wc/brief/tournament     — Claude journalism brief (24h TTL)
- POST /wc/projections/refresh  — manual trigger

**Cron:** every 15 min during WC window (June 11–July 19).
Rotates curr→prev in KV for daily mover diff.

**KV keys (FIELD_JOURNALISM, id: 83edf19398da4ed184a42746cb85c9d7):**
wc:projections:current, wc:projections:prev, wc:movers:current, wc:brief:movers

**Client (renderWCTournamentBracket, async):**
1. Journalism brief (gold left-border card, "Tournament Outlook")
2. Movers: ↑/↓ delta%, "did not play" label for secondary beneficiaries
3. 48-team probability table: Team | Grp | R32 | R16 | QF | SF | Final | Win
   Color-coded (green ≥50%, gold ≥15%, smoke <15%)
4. Falls back to conditional R32 matchup view if projections unavailable
- switchWCTab() now calls renderWCTournamentBracket() instead of conditional bracket
- Smoke A530–A532

**Coverage note:** Odds API has ~71 of 72 group stage games. Germany vs Ecuador
(simultaneous final matchday) not yet listed. Missing-fixture padding handles this.
Coverage reaches 100% when bookmakers post final matchday odds.

### WC Live Conditional Bracket (05eed4a) — from earlier this session
Groups | ⚡ Bracket sub-tabs. Retained as fallback view in renderWCTournamentBracket.

### UserDO Architecture (61d309f + 1897128) — from earlier this session
UUID-keyed DO, no PII. watchHistory (30d), seriesLedger, dramaticMomentsMissed (7d).
Wired into openBottomSheet() + mvAdd() + visibilitychange.
Routes: /user/init, /user/state, /user/event.

## NEXT SESSION: BRACKET TRAP DETECTION (QUEUED)

The "finishes lower but gets easier path" narrative — highest-value journalism signal
identified this session. USA is better off finishing 2nd in Group D IF Colombia beats
Portugal in Group K (R16 opponent drops from Belgium rank-9 to Colombia rank-13).

What needs building in wc-tournament-projections.js:
1. Position-conditional probability tracking in the simulation loop:
   countsByPos[team][1 or 2] = { R32, R16, QF, SF, Final, Champion, total }
2. detectBracketTraps(projections): scan for pChamp_as_2nd > pChamp_as_1st + 0.5%
   Returns: { team, group, pChampIf1st, pChampIf2nd, delta, structuralReason }
   structuralReason = which specific groups produce the path divergence
3. buildMoversBriefPrompt() addition: BRACKET TRAPS section
   "USA faces Belgium in R16 as 1D. As 2D (requires Colombia wins Group K):
    faces Egypt/Iran in R32, Colombia in R16. pChamp: 2.8% → 3.4%."
4. Journalism brief writes the non-obvious cross-group narrative

This is ~60 lines in wc-tournament-projections.js + prompt update. No client changes.

## PRIORITY LIST

1. Bracket trap detection (above) — WC journalism, high value, ~60 min
2. Series dots 6a          ← both NBA Finals + SCF still live
3. Arc sparkline GLYPH 6b  ← pair with 6a
4. WHOLE FIELD toggle 6c
5. State transition 6e
6. Drama spectrum 6f
7. WC projections first real data — verify pChamp order after next cron
8. M5 score ticker fade (assess severity)
9. Wimbledon draw context  (before July 7)
10. Design system (~90 min TYPE C)

## RELAY COMMITS THIS SESSION
- 6d53153 — initial projections engine
- e41aee1 — name normalization + simulation fixes (round2 restored, effectiveRemaining, poissonSample)
- 63cb2ae — cron gate: every 15min (was hourly)
- 7d0539f — USA→United States + Turkey→Türkiye aliases
- 6bfb501 — inverted defense formula fix + missing-fixture padding (Ecuador fix)

## SMOKE
575/0
