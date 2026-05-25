# FIELD Handoff — May 25 2026 (Journalism Depth Session — Items 1-3)

HEAD: 90f6c22
Smoke: 169/0
Deploy: SUCCESS
SW_VERSION: 2026-05-25a

## WHAT WAS BUILT

Journalism depth items 1-3 (all no new APIs):

**Item 1 — ESPN in-game leaders** (zero extra calls)
  _extractLeader() reads comp.leaders already in ESPN scoreboard response.
  Extracts top scorer per team: name + stat (points/goals/hits/yards).
  homeLeader/awayLeader added to espnScores on every poll.
  Compound prompt now gets: "Leaders: Brunson 28pts · Mitchell 22pts"
  Before: "Knicks lead by 3 in Q4" — now: player names + numbers.

**Item 2 — MLB probable pitchers wired** (data already extracted, never used)
  homePitcher/awayPitcher from MLB Stats API were extracted but
  never reached the journalism prompt. Now injected:
  "Pitchers: G.Cole (2.14 ERA) vs C.Burnes (3.01 ERA)"

**Item 3 — Series cliché check extended**
  "punch their ticket" slipped into a series preview (screenshot evidence).
  Compound editorial previously only checked result.brief.
  Now checks: result.series[], result.game_briefs[], result.epl[]
  FIELD_DEBUG logs banned phrases in all compound output sections.

## WHAT'S NEXT

Items 4-6 (relay routes, ~2 hr total):
  4. BDL series stats relay route (~45 min)
     Brunson 29.0 PPG this series as a fact, not a phrase to invent
  5. NHL API shot/save data relay route (~25 min)
     Vasilevskiy .945 sv% tonight — concrete goalie context
  6. MLB Stats game feed relay route (~35 min)
     pitch count, ERA this month, box score leaders per game

Items 7-9 (cultural signals, later):
  7. Reddit buzz signal
  8. ESPN /athletes/{id} career stats
  9. Google Trends cultural relevance

## ALSO PENDING

- TYPE A daily update for May 26
- SW_VERSION must be bumped on next deploy day (Rule 23)
- Current State doc still stale
