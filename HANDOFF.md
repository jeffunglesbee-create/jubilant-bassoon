# FIELD Handoff — May 31 2026 (TYPE B — Relay NBA Routing Fix)
**jubilant-bassoon HEAD:** 374a6ef · Smoke: 238/0
**field-relay-nba HEAD:** e7ef5e7 · Deploy: SUCCESS

## TIER 0 DEADLINES
- **WCF G7 result needed** — TYPE A update pending
  Replace "TBD — Western Champion" across NBA Finals G1-G7 (7 entries)
  Update venues: Paycom Center (OKC) or Frost Bank Center (SAS)
  Update G1 matchupNote with series context
  **Deadline: before June 3 tipoff (NBA Finals G1)**
- Stanley Cup Final G1: June 2 — VGK @ CAR already wired
- World Cup 2026: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- USPTO provisional: ~June 25

## SESSION START (next session)
1. Declare TYPE A — WCF G7 result update
2. `cd /home/claude && git clone {PAT-URL}/jubilant-bassoon.git`
3. `node smoke.js index.html` — must be 238/0
4. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`

## WHAT CHANGED THIS SESSION (relay only — jubilant-bassoon untouched)

### Relay: NBA routed to dedicated API-NBA endpoint (e7ef5e7 — DEPLOYED)
Problem: sport=nba was hitting API-BASKETBALL (v1.basketball.api-sports.io?league=12),
burning shared quota with WNBA. Dashboard showed basketball at 6,458/7,500 (86%),
API-NBA Pro plan at 0/7,500 — completely idle.

Fix (3 changes to src/index.js):
1. APISPORTS_HOSTS: added 'nba' → 'v2.nba.api-sports.io'
2. V2_LEAGUES['nba']: sport 'basketball'→'nba', leagueId null (date-only URL)
3. handleV2Games: nba branch builds URL as /games?date={date}, no league/season params
   Reuses adaptBasketball — same api-sports.io response schema expected.
   [VERIFY] comment added — confirm field paths match on first live response.
4. WNBA unchanged: basketball + leagueId=13

Effect: NBA has 7,500/day dedicated quota. Basketball now WNBA-only.

### Confirm after NBA Finals G1 (June 3):
Check dashboard — API-NBA should show usage, API-BASKETBALL should be low.
If NBA scores missing → check adaptBasketball field paths against v2.nba response.

## REMAINING RELAY ACTIONS (field-relay-nba — next relay session)
1. Remove /atp/* route — ATP ToS Section 7 explicitly prohibits systematic retrieval
2. Deprecate /mlb-umpire-scrape — automation replaced it May 30

## FIELD_V2_SOURCES — CURRENT STATE (jubilant-bassoon)
nba:true, nhl:true, mlb:true, wnba:true, mls:true (LIVE)
epl/ucl/europa/conference/eflchamp/eflone/efltwo/laliga/seriea/bundesliga/ligue1: false
wc26: false — re-enable June 11

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- ADR-002: `1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4`
- PAT: ghp_***redacted*** (see memory) (exp May 2027)
