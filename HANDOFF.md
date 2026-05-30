# FIELD Handoff — May 31 2026 (TYPE D/A — Audit + Finals Prep)
**HEAD:** 7db0eca
**Smoke:** 238/0
**Deploy:** SUCCESS

## TIER 0 DEADLINES
- **WCF G7 result needed TONIGHT** — SAS @ OKC, 8pm ET, NBC/Peacock
  Replace "TBD — Western Champion" with winner across NBA Finals G1-G7 (7 entries)
  Update venues: Paycom Center (OKC) or Frost Bank Center (SAS)
  Update NBA Finals G1 matchupNote with series context
  **Deadline: before June 3 tipoff (NBA Finals G1)**
- Stanley Cup Final G1: June 2 — VGK @ CAR already wired
- World Cup 2026 Phase 1: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- USPTO provisional: ~June 25

## SESSION START (next session)
1. Declare TYPE A — WCF G7 result update
2. `git pull && cp index.html /home/claude/index.html`
3. `node smoke.js index.html` — must be 238/0
4. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`

## WHAT CHANGED THIS SESSION

### api-sports quota fix (SHIPPED 7db0eca)
FIELD_V2_SOURCES: 12 dead European football endpoints disabled.
epl/ucl/europa/conference/eflchamp/eflone/efltwo/laliga/seriea/bundesliga/ligue1 = false
wc26 = false (re-enable June 11)
Root cause: flags all true despite comment "set true next season". Football API
hit 7,718/7,500 (over limit). Now only mls:true on football. Resets 00:00 UTC.

### api-sports NBA routing (RELAY — NOT YET DONE)
Dashboard: API-NBA Pro plan 0/7,500 used (v2.nba.api-sports.io) — completely idle.
API-BASKETBALL Pro: 6,458/7,500 — NBA traffic on wrong endpoint.
Relay fix: route sport=nba to v2.nba.api-sports.io (verify schema diff first).
BASKETBALL then WNBA-only. Both quotas separate, both 7,500/day.

### NBA Finals + SCF prep (SHIPPED 7db0eca)
NBA Finals G1-G7: crew "Mike Breen · Jeff Van Gundy (ABC)", _gameImportance:playoffs
NBA Finals: corrected NBC/Peacock to ABC throughout (journal + comment)
SCF G1-G7: crew "Sean McDonough · Ray Ferraro (ABC)", _gameImportance:playoffs
SCF G7: no _gameImportance (auto-detects series_deciding)
FRANCHISE_MISERY: NYK (53yr title drought), CAR (20yr), VGK (3rd Final in 9yr)

## KEY RELAY ACTIONS (field-relay-nba)
1. Route sport=nba to v2.nba.api-sports.io/games?date={date} — verify schema first
2. Remove /atp/* route — ATP ToS Section 7 explicitly prohibits systematic retrieval
3. Deprecate /mlb-umpire-scrape — automation replaced it May 30

## DECISIONS MADE THIS SESSION
- Light mode: NO — Jeff confirmed no daily friction in practice
- Tennis live scores: NO viable source. ATP ToS prohibits systematic retrieval.
  Sportmonks does not cover tennis. RapidAPI options carry upstream ATP risk.
- UPDATE S1 relay SSE: buildable for NBA/NHL/MLB/WNBA/MLS. ATP excluded (ToS).
  CF Worker SSE duration needs verification before build session.
- SEASONAL-ARC: unblocked from Event Bus. Uses getDramaHistory() (localStorage).
  Build from May 28 spec #55 Series Pressure Index independently.
- ADR-002: ~80% complete organically. ATP is last live unresolved removal item.
- Savant CORS: access-control-allow-origin:* confirmed May 21. Not a scrape.
  Keep fetchSavantGameFeed(). Tag for attorney review at commercial launch.

## SMOKE-VERIFIED ONLY — BROWSER CONFIRMATION NEEDED
1. Sport voice arrays (baseball/hockey/soccer)
2. Three-part arc structure (J3 + J2)
3. _bannedExtension active evolution
4. Extra innings Night Owl fix
5. MLB vary-the-angle analytics
6. MCP health panel section
7. Android long-press fix (A309)
8. O(1) per-game KV briefs (A312)

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- Build Session List v7.27: `1TaywA5e3NLpJLpXcQPZwDMhDG79_rXMsvIa_J_uBOfY`
- Infrastructure Backlog: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`
- Patent Defense Decision Record: `1ze6m687RYNksUVzKRZVhoeHhRPb4Nb3RYFBrqOUrCe4`
- ADR-002 Three-Component Architecture: `1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4`
