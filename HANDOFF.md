# FIELD HANDOFF — 2026-06-04

## State
HEAD: 038281c · SW: 2026-06-04i · Smoke: 419/0

## Tonight / Tomorrow
- **SCF G2**: VGK @ CAR — tonight Jun 4, 8 PM ET, ABC · Lenovo Center, Raleigh
  VGK leads 1-0 (G1: VGK 5-4; Hertl GWG)
- **NBA Finals G2**: NYK @ SAS — tomorrow Jun 5, 8:30 PM ET, ABC · Frost Bank Center
  NYK leads 1-0 (G1: NYK 105-95; Brunson 30pts/13 Q4; Wemby 6-21 FG)

## Shipped This Session

### BUG FIXES (earlier today)
- VENUE DUPLICATE (3407cf1): removed redundant venue fallback in buildLifeStageContent
- STALE V2 SCORES (e7416d3): ET date guard skips UTC-indexed finals from prior day
- HALFTIME WITH SCORE (e7416d3): basketball/hockey sport-specific halftime label + score
- NBA FINALS G1 (240ae4e): NYK 105-95 SAS, leads 1-0; G2 matchupNote updated
- SW CI SYNC FIX (a81220e): autodeploy.yml regex fixed — \s+=\s+ and [^']* patterns

### WC D1 GROUP TABLE (038281c relay: 0d9c3ac)
D1 database `wc2026` created (f26669de-e772-4b56-a6d1-f8fdea08a4d4, ENAM).
Schema: wc_group + wc_results tables + wc_third_place_standings view + 2 indexes.
Relay: WC2026_DB binding in wrangler.toml, 5 new functions, 3 new routes:
  - GET /wc/standings[?group=X] — D1 group standings JSON
  - GET /wc/third-place — cross-group 3rd place view
  - POST /wc/admin/seed — manual result entry (Bearer-gated)
  - V2 auto-write: wc26 finals trigger writeWCResult (INSERT OR IGNORE)
  - adaptFootball now includes round field for group detection
index.html: fetchWCStandings() + _wcStandings/_wcStandingsTs cache vars
Smoke: A317-A319 added — 419/0

### SPECS WRITTEN THIS SESSION
- MOBILE-INTEL-A v2: Drive 1S5kPUwlV2k2B-3d3rG3_1UH09NrblCpy
- Watch Engine (Pipeline C) v2: Drive 1y2oziw03T6zwvQuxcFGARbcYbeFVpLpB
- WC D1 Group Table v2: Drive 1HdYpPez7OJx-1DqwkMkUaEAjKk41z7U3
- SW API Caching spec: Drive 1yv8H0Vi8mSM5kguy0t5xj2T_1T47UW8u
- Worker KV Pre-render spec: Drive 1wHbY7BnDYn8EEe31b8o0sI-faGc-G7VU

## WC2026 Status (June 11 hard deadline — 7 days)
DONE: D1 schema + relay routes (038281c / 0d9c3ac)
REMAINING:
  1. Data flip (~90 min): 104 WC games in index.html, broadcast chips
  2. R2 WC Team Context (~125 min): 48 JSON files, TYPE A research
  3. F09 REST Countries (~10 min)
  4. Group table UI in index.html (part of data flip session)
D1 is ready to receive results from June 11. No further infra changes needed.

## Next Session Triggers
- SCF G2 result tonight → update G2 result + series records G3-G7
- NBA Finals G2 tomorrow → update G2 result + series records G3-G7
- World Cup data flip — June 11 HARD DEADLINE (~90 min)
- R2 WC Team Context — before June 11 (~125 min)

## P1 Carry-Forwards
- [ ] iPad CLS LIVE verification (post-PM-26)
- [ ] PM-26-N-1, J-2, J-3, WPT scroll-mode
- [ ] Odds Budget date staleness (shows 2026-05-29)
- [ ] 7th inning stretch callout (situation.inning===7 && isTop===false)
- [ ] Final outcome display for low-drama games (score + F when drama < 50)
- [ ] My Services Install App button (~5 min)
- [ ] meta-description tag (Lighthouse fail, ~5 min)

## Canonical Refs
CI/Deploy: Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
Current State: Drive 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
Build Backlog: Drive 1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk
WC D1 Spec v2: Drive 1HdYpPez7OJx-1DqwkMkUaEAjKk41z7U3
D1 database ID: f26669de-e772-4b56-a6d1-f8fdea08a4d4
