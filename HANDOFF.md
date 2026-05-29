# FIELD Handoff — May 29 2026 (Session End — TYPE C: Phase 0 api-sports.io relay adapter)

## SESSION TYPE
TYPE C — Feature. Phase 0 complete. Zero behavior change. ESPN paths untouched.

## Code HEAD
jubilant-bassoon: `16d396a` — client V2 stub (smoke 238/0)
field-relay-nba:  `036c297` — /v2/* routes deployed (relay CI success)

## COMPLETED THIS SESSION

### Hotfix on session open
fetchMLSLive + startOpenF1Engine re-applied (prior push lost to CI conflict) → `274d071`

### Phase 0: api-sports.io relay adapter

**Relay (field-relay-nba 036c297):**
- FieldGame normalized schema + 4 adapters: adaptBasketball, adaptHockey, adaptBaseball, adaptFootball
- `/v2/games?sport=X[&date=Y]` → FieldGame[] for: nba · nhl · mlb · epl · mls · ucl · laliga · seriea · bundesliga · ligue1
- `/v2/standings?sport=X` → standings from api-sports.io
- Uses env.APISPORTS_KEY (already set). Football: v3 host. Others: v1.
- Health string updated: relay-multi now includes v2.

**Client (jubilant-bassoon 16d396a):**
- V2_RELAY_BASE const
- FIELD_V2_SOURCES per-sport flags (all false — ESPN untouched)
- fetchV2Games(sport, date) → FieldGame[] or []
- mapV2ToESPN(fg) → espnScores entry format

## PHASE 1 WHEN READY
Set FIELD_V2_SOURCES.nba = true and wire fetchV2Games into ESPN polling cycle.
Field paths marked [VERIFY] in adapters need confirming against live response before cutover.
Suggested order: EPL/MLS → NHL → MLB → NBA.

## STILL OPEN (carried)
- Journalism recovery (Gemini quota)
- Dropbox refresh-token: add 3 secrets
- VAPID browser opt-in test
- Golf Doc 1 (1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM): scrub key + DECOMMISSIONED
- Data-sourcing matrix merge → 1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M
- Build Session List paste (v7.26 draft → 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ)

## TIER 0 DEADLINES
- NHL SCF shell (CAR — ECF closing) — IMMINENT
- NBA Finals G1 shell (June 3, vs NYK)
- World Cup 2026 Phase 1 (June 11 HARD)
- USPTO provisional (~June 25)

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Build Session List (canonical): 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ
Infrastructure Backlog (Tier 2): 1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw
ESPN Pivot spec (in-repo): docs/espn-pivot-phase0-1-2026-05-29.md
