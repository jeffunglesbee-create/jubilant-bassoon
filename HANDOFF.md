# FIELD Handoff — May 29 2026 (Session End — Golf Intelligence Research + G-INF-1)

## SESSION TYPE
TYPE B+C — Research/Investigation + Feature Build (Golf Intelligence Infrastructure)

## Code HEAD
`a00a413` — G-INF-1 PGA Tour relay infrastructure · Smoke 241/0

## COMPLETED THIS SESSION

### Daily Update
- NBA WCF: SAS evened series 3-3 (Game 6 SAS 118-91 OKC). **Game 7 Saturday May 30 8pm ET OKC hosts**
- NHL ECF: CAR leads MTL 3-1. **Game 5 tonight May 29 8pm ET at CAR**. VGK waiting in SCF.
- NBA Finals G1: Wednesday June 3, NYK vs WCF winner (OKC or SAS). Shell needed by Tuesday.
- Golf: Charles Schwab Challenge R2 in progress, Lee Hodges leads, cut happening today.
- MLB: Full Friday slate, no national exclusives.

### Golf Intelligence Research (full TYPE C investigation)
Complete investigation documented in Drive. Summary:

**Relay infrastructure (DEPLOYED):**
- `field-relay-nba` `/pgatour` route live (commit 3e11c02)
- Fixed GET-only guard bug (commit 3e11c02) — POST now passes through
- PGA Tour GraphQL confirmed working: SG splits, statLeaders, playerDirectory, Schedule
- Key: `da2-gsrx5bibzbb4njvhl7t37wqyl4` (public bundle key, server-side in relay)

**Data confirmed available:**
- Season SG splits back to 2010 (16 seasons) via statLeaders/StatDetails
- TournamentPastResults: position + total + per-round scores via `rounds { score }`
  Type: HistoricalRoundScore — only `score` field confirmed valid (not roundNumber)
- Colonial R{year}021 pattern confirmed stable 2015–2025
- 6 years of Colonial per-round data collected (2016, 2019, 2021, 2022, 2023, 2025)
- Player IDs: PGA Tour IDs stable (Spieth=34046, Scheffler=46046, McIlroy=28237)

**Colonial historical findings:**
- R4 field avg: +0.38 strokes harder than R1 (range: +0.1 to +2.3)
- Winners split 3/6 closers vs faders — Colonial doesn't systematically reward closers
- Course DNA leaders: Spieth (-8.2 avg vs par, 5 made cuts), Scheffler (-8.0), Finau (-5.2)
- Kevin Na: COLONIAL CLOSER 3/4, avg R4 68.0 (-2.0)
- Gary Woodland: COLONIAL CLOSER 2/2, avg R4 66.5 (-3.5) — highest R4 value in dataset

**Novel patent-adjacent metrics designed:**
- Colonial Closing Score: hist R4/R1 delta + recency weight + SG:Putt adjustment
- Course DNA Fingerprint: empirical winner SG profiles vs theoretical course fit
- Scoring Source Disaggregation: sustainable (ball-striking) vs volatile (putting/scrambling)
- Birdie Chain Index: Bounce Back% × Reverse Bounce Back% × live round state
- Approach Band Matching: proximity at course-specific yardage vs tour average

### G-INF-1 — PGA Tour GraphQL Relay Infrastructure (SHIPPED)
`a00a413` — 154 lines added, 241/0 smoke

**Three deliverables:**

1. `PGATOUR_RELAY` constant
   → `https://field-relay-nba.jeffunglesbee.workers.dev/pgatour`

2. `fetchPGATourStat(statId, year)` — async, 2-tier cache
   - Memory: `_pgatourCache[stat_${statId}_${year}]`
   - localStorage: `field_pgt_stat_${statId}_${year}`, 3600s TTL
   - Returns `statDetails` object with ranked player rows + statValue

3. `fetchPGATourPlayerDir()` — async, 2-tier cache
   - localStorage: `field_pgt_playerDir_R`, 86400s TTL
   - Returns active players array: `{id, displayName, country, owgr}`

4. ESPN golf competitor extraction
   - golf ESPN branch now extracts `comp.competitors[]` (previously discarded)
   - Stores to `window._espnGolfLB[tournName] = {lb, round, updated}`
   - Per-player: `{name, espnId, total, status, linescores[], thru, position}`

**Smoke A240-A242 added:**
- A240: PGATOUR_RELAY constant present
- A241: fetchPGATourStat defined
- A242: window._espnGolfLB extraction present

## CURRENT STATE

HEAD: a00a413 · Smoke 241/0 · SW_VERSION: 2026-05-28c (not bumped — infra only, no UX change)

## OPEN (from prior sessions, still unverified)
- MLB/WNBA brief cards on live games — untested
- Stakes brief on elimination games — untested
- Night Owl secondary capsules — untested
- NBA RAI visual confirmation

## QUEUE

### TIER 0 DEADLINES:
⚡ NHL SCF shell — CAR likely closes ECF tonight (Game 5). Build tomorrow.
⚡ NBA Finals G1 shell — June 3 deadline (Tuesday). WCF Game 7 Saturday resolves matchup.
⚡ World Cup 2026 Phase 1 — June 11 HARD DEADLINE
⚡ USPTO provisional — ~June 25

### GOLF INTELLIGENCE SCHEDULE:
G-INF-1 ✅ DONE — relay wired, ESPN extraction live
G-INF-2 — Saturday/Sunday: PLAYER_ID_BRIDGE + TOURNAMENT_CALENDAR (~2h)
G-CORE-1 — Sunday/Monday: golfDramaScore + colonialClosingScore + courseDNAFit (~3h)
G-CORE-2 — Monday: prefetchGolfHistoricalData pipeline (~2.5h)
G-UI-1 — Tuesday (after NBA Finals shell): golf card intel section (~3h)
G-UI-2 — Wednesday: Night Owl golf + J12 journalism type (~2h)
G-PREP-1 — Monday June 8: US Open Oakmont data verification (~45min)
G-PATENT — Week of June 15: USPTO claim documentation (~2h)

### NEXT SESSION PRIORITY ORDER:
1. Check NHL Game 5 result → build SCF shell if CAR wins
2. Build NBA Finals G1 shell (TBD vs NYK, June 3)
3. G-INF-2: PLAYER_ID_BRIDGE + TOURNAMENT_CALENDAR

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Journalism Quality Spec: 1oSj9Wl9lZl_RGGElZdn_dhI4s3vzvnkv5HazELKSw-0
Golf Intelligence Research Drive doc: 1uzCk3ZrPfWPJVYg2wmpbEq_yFa8y5YmoSvJSup9sq5I
