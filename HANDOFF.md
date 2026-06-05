# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 5ff7ede · Smoke: 493/0 · Unit tests: 60/0
field-relay-nba HEAD: b888a5f

## RUWT Deep Analysis — Results

RUWT = US 9,421,446 B2. Claim requires: composite interest level from
multiple factors → threshold comparison → recommendation/notification.

### GameDO: CLEAR
Distributes mathematical facts only (winProb=Poisson output, wpDelta=probability
change, _crunch=binary named condition). Extended patent defense comment enumerates
every field and its factual nature. No code changes needed.

### Permutations Engine: CLEAR
Computes advancement PROBABILITIES (mathematical facts about outcome distributions),
not interest/excitement scores. Added explicit RUWT PATENT DEFENSE comment to
field_utils.js distinguishing probability from interest level in three specific ways.

### Win Probability — three risks found:

1. getOTWMomentum() — HIGH — FIXED (5ff7ede)
   Pattern: drama_history[last].s - [prev].s >= 10 → '↑' in OTW banner
   All three RUWT elements: composite score + threshold + display element.
   Fix: score-event detector.
     recordScoreSnapshot(gameId, h, a): writes factual score-change log.
     getOTWMomentum(): binary check — did scoring happen in last 3 minutes? Yes/No.
     No composite score read, no threshold comparison on interest level.

2. _otwFindWCLiveGame() sel score — MODERATE — FIXED (5ff7ede)
   Pattern: sel = f(crunch, WP, elapsed) → numerical composite → recommendation
   Fix: strict categorical priority tiers (T1-T6), no composite arithmetic.
     T1: penalty_shootout | T2: man_advantage/added_time | T3: late_deficit
     T4: elapsed>=80 AND draw>20% (AND-gated binary)
     T5: elapsed>=60 AND draw>25% (AND-gated binary) | T6: any live WC
     Within tier: sort by elapsed time only (single factual fact).
   STATE 1 check updated: wcFire.tier <= 3 (not score >= 70).

3. _otwFindLiveGame(50) dramaScoreLive — MODERATE — DOCUMENTED, NOT FIXED
   Pattern: dramaScoreLive() > 50 → game selection (existing ESPN path)
   Display uses named labels (mitigated). Selection mechanism is composite.
   Planned refactor: replace with buildOTWStateLabel() category-based selection.
   This is a larger change — documented for Drama Dial session.

4. late_deficit threshold loserWP < 0.15 — LOW — NO CHANGE
   Single probability, single threshold, binary boolean output.
   Not composite. Mitigated by named-condition output. Keep with documentation.

## RUWT Status Post-Session
  ✓ GameDO: fully documented, CLEAR
  ✓ Permutations Engine: fully documented, CLEAR
  ✓ getOTWMomentum: fixed (drama score → score event)
  ✓ _otwFindWCLiveGame: fixed (composite sel → categorical tiers)
  ○ _otwFindLiveGame(50): documented, refactor deferred to Drama Dial session
  ○ Drama Dial: not yet built — the long-term FTO solution (patent-priority)

## Smoke: 490→493 / Unit tests: 60/0

## Key Refs
jubilant-bassoon HEAD: 5ff7ede
field-relay-nba HEAD: b888a5f
Smoke: 493/0 · Unit tests: 60/0
Next: Scoreboard P0 diagnosis (NBA Finals live, daily breakage)
