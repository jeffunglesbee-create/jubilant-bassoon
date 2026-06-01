# FIELD Handoff — June 1 2026 PM-2 (Axis 3 Phase B subtasks 6+7+8 landed · SW 2026-06-01f live ahead of Cup G1)

**jubilant-bassoon HEAD:** 5d542e9 · Smoke: 241/0 pre-gate (A360–A364 green post-gate; A313/A314 known post-gate red) · SW_VERSION 2026-06-01f
**field-relay-nba HEAD:** unchanged (0ae4c11) · STRUCTURAL 6 green · WOW 8 e2e verified May 31
**Session Doc (PM-2, this session — Drive):** 1TJ4nsP43yxdDNAs5ReZhlgT0BAWVL3-9-7GnSs9bh1c
**Session Doc (PM-1 prior — Drive):** 12CAk9NF1hytbMlJ2JIJSvVWYMMXG_gCUdmKn3E3nH60
**Session Doc (AM prior — Drive):** 1_9ECU61QSWoWFOPgH9oxsCLZ11jj1E_YqZP2lWXwPG8
**WC2026 Format Corrections (READ BEFORE ANY WC BUILD):** 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks
**Brief drafts (from PM-1):** `r2_finals_briefs.md` (aspirational) · `r2_finals_briefs_production.md` (production-shape — now more reproducible by live pipeline post-Phase-B)

## TIER 0 DEADLINES

- **Stanley Cup G1: June 2 — TONIGHT** — VGK @ CAR (first live Phase B test)
- **NBA Finals G1: June 3** — SAS hosts NYK (per slate; HANDOFF earlier said reverse — slate is canonical)
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-2)

User opener: "start_session, run phase b after startup". Executed SESSION START hard gate, then landed Axis 3 Phase B subtasks 6 (coaches), 7 (historical anchors), and 8 (injury refactor) in a single commit. Subtask 9 (playoff leaders feed) explicitly deferred — see below.

### Phase B subtask 6 — head coach lookup tables (commit 5d542e9)

Hardcoded tables per ADR-001 (coaches STABLE within season):
- `NHL_HEAD_COACHES`: 32 teams, keyed by abbrev (CAR/VGK/...). Source: Pro Hockey Rumors directory (June 2025) + Wikipedia 2025-26 VGK season page (Cassidy → Tortorella March 29 2026).
- `NBA_HEAD_COACHES`: 27 teams, keyed by lowercase full name. Source: Wikipedia 2025-26 team season pages + CBS/SSN/ClutchPoints power rankings. MIN/NOP/UTA omitted (graceful degradation > invented data per "I don't know" rule).
- Verified for the four active championship-round teams: CAR Brind'Amour · VGK Tortorella · SAS Johnson · NYK Brown.
- Getter: `getHeadCoachForTeam(teamName, sport)` uses existing `getNHLAbbrev` for NHL, lowercase name for NBA.

### Phase B subtask 7 — series historical anchors (commit 5d542e9)

`SERIES_HISTORICAL_ANCHORS` with two entries:
- `NHL_SCF_2026`: "Carolina's first Stanley Cup Final since winning it in 2006 (20 years) — fourth conference-final breakthrough attempt since 2019, all prior three lost; Vegas making third Cup Final in nine years…"
- `NBA_FINALS_2026`: "Knicks' first NBA Finals appearance since 1999 (27 years) — lost 4-1 that year to the Spurs; chasing first NBA title since 1973 (53 years)…"
- Getter: `getSeriesHistoricalAnchor(game)` detects championship round via `game.league` regex (`/stanley\s*cup\s*final/`, `/nba\s*finals/`) and `game._section`.
- All historical claims verified pre-commit against NHL.com, ESPN, CBS Sports, The Ringer, FanDuel, StatMuse (no inventions).

### Phase B subtask 8 — injury routing refactor (commit 5d542e9)

The Phase A scaffolding intended `game.injuries` as a populated array → `[INJURY:]` tag, but the legacy inline `bdlInjuryContextSync` at line ~17389 emitted its own raw `Injuries: X (status)` line in the standalone J3 path only, while the compound path had NO injury context. Fix:
- Retired the inline call from standalone J3 (replaced with comment block).
- `populateSeriesContext` now invokes `bdlInjuryContextSync` once per game, parses its `"Injuries: X (status), Y (status)."` output into `game.injuries = ["X (status)", "Y (status)"]`, and the existing `buildSeriesContextTags` emits the `[INJURY:]` tag.
- Net effect: compound path now ALSO gets NBA injury context (improvement); standalone path output format upgrades from raw line to semantic tag; double-injection impossible by construction.
- NHL injury feed (api-web.nhle.com) remains deferred to the subtask 9 cycle — bdl is NBA-only, so NHL games currently produce no `[INJURY:]` tag (correct graceful degradation).

### `populateSeriesContext(game)` — Phase B's single integration point

Idempotent mutator. Reads from `getHeadCoachForTeam`, `getSeriesHistoricalAnchor`, `bdlInjuryContextSync`. Sets `game.coaches`, `game.historical`, `game.injuries`. Wrapped in try/catch (silent fallback). Wired into BOTH J3 paths immediately before `buildSeriesContextTags(g)`:
- Standalone: `fetchFIELDBriefFromClaude` per-game line (line ~17418)
- Compound: `buildCompoundPrompt` per-game line (line ~18602)

### `buildSeriesContextTags` minor update

`[COACH:]` tag formatting now uses `teamNick(game.home)` instead of full `game.home`. Matches HANDOFF acceptance: `[COACH: Hurricanes — Brind'Amour; Golden Knights — Tortorella]`.

### Smoke (post-gate green)

- A53 strengthened — now asserts the single-call-site invariant (`bdlInjuryContextSync` called only from inside `populateSeriesContext`) rather than presence in the now-removed inline block. Strips JS comments before counting to avoid false-positives from FIELD_FEATURES doc strings.
- A361: NHL + NBA coach tables defined; the four championship-round teams covered; `getHeadCoachForTeam` defined.
- A362: `SERIES_HISTORICAL_ANCHORS` defined for both championship rounds with verified framings; `getSeriesHistoricalAnchor` defined.
- A363: `populateSeriesContext` defined; mutates coaches/historical/injuries; invoked from ≥2 call sites (both J3 paths).
- A364: inline `bdlInjuryContextSync` call retired from standalone J3; function itself still defined; `populateSeriesContext` references it; `[INJURY:]` tag still emitted.

### Functional sanity (pre-push, node harness)

- Cup G1 (CAR vs VGK, Stanley Cup Final league string): `coaches = {home: "Rod Brind'Amour", away: "John Tortorella"}` ✅ `historical` = "since 2006…" ✅
- NBA Finals G1 (SAS vs NYK, NBA Finals league string): `coaches = {home: "Mitch Johnson", away: "Mike Brown"}` ✅ `historical` = "since 1999…" ✅
- Regular-season game: `coaches` populated; `historical = null` ✅ (correct — anchor only fires for championship round)

### SW_VERSION + Rule 23

Bumped 2026-06-01e → 2026-06-01f in both index.html and sw.js. Deploy gate (fast smoke) for 5d542e9: SUCCESS. Live before Cup G1 puck drop tonight.

### Decisions / rules invoked

- **DO NOT INVENT** — every coach + anchor verified against at least one authoritative source before commit. MIN/NOP/UTA omitted from NBA table when verification not reachable.
- **"I don't know" rule** (recent memory update) — applied to coach uncertainty: graceful degradation (no tag) > stale guess.
- **ADR-001** — coaches + anchors hardcoded (STABLE). Playoff leaders explicitly NOT hardcoded (COUNTERS) — feed-required, deferred.
- **Rule 23** — SW_VERSION bumped on functional change.
- **Going-slower-is-never-acceptable** — cut subtask 9 cleanly with documented deferral rather than risk a thinly-tested feed integration two hours before Cup G1 puck drop.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (now urgent: SW 2026-06-01f is live)
1. **SW `2026-06-01f` active in browser**
2. **Generate / inspect a J3 brief on the live site tonight (June 2) when Cup G1 lands.** In prompt context, verify:
   - `[COACH: Hurricanes — Rod Brind'Amour; Golden Knights — John Tortorella]`
   - `[HISTORICAL: Carolina's first Stanley Cup Final since winning it in 2006…]`
   - `[INJURY: …]` empty (NHL feed deferred — expected)
   - `[PLAYOFF STATS: …]` empty (subtask 9 deferred — expected)
   - Brief output should now reach noticeably closer to `r2_finals_briefs_production.md` depth on coach + first-since-X framing
3. **JQ-5 + post-JQ-5 browser confirmation (carried from AM):**
   - My Services modal Journalism Quality section renders 5 subsections
   - `.brief-prose-score` badge does NOT appear in main UI
   - Brief uses TIME-PERIOD ANCHORING and SLATE BOUNDARY rules
   - Score ticker chips no longer show stale FT entries (15-min pruning)

### P0 — TIER 0 game-day
4. **June 2 (TONIGHT):** Stanley Cup G1 VGK @ CAR — first real Phase B brief test in production
5. **June 3:** NBA Finals G1 — same. SAS hosts G1 per slate (line 7424). Relay first real-traffic for /v2/games?sport=nba.

### P0 — Axis 3 Phase B subtask 9 (playoff leaders feed) — NOW URGENT
6. **NHL skater_leaders feed via field-relay-nba** (~60-90 min):
   - Probe NHL Stats API skater_leaders or api-web.nhle.com leaders endpoint with playoffs filter (gameTypeId=3)
   - Target output: `["Marner 24 pts in 16 games", "Eichel 21 assists", "Dorofeyev 11 goals", "Andersen 1.44 GAA .928 SV%", "Hart 2.22 GAA .924 SV%"]`
   - Cache pattern like `_bdlStatCache` (TTL ~15 min during games)
   - Populate `game.playoffLeaders` inside `populateSeriesContext` (existing placeholder block, zero other code changes)
   - Acceptance: Cup G1 prompt context shows `[PLAYOFF STATS: …]`
7. **NBA playoff leaders source decision** (~60 min):
   - Investigate BDL playoff endpoint (untested)
   - Or stats.nba.com leaders endpoint via relay proxy (CORS)
   - Or narrowly-scoped hardcode for Finals only as MVP (ADR-001 violation, accept only if Finals-only)
8. Add A365 smoke assertion for playoff leaders wiring

### P0 — Hardcoded calendar flip
9. **June 11 HARD:** flip `wc26:true` in FIELD_V2_SOURCES (~5 min change)

### P1 — J3 path parity (standalone vs compound) — carried
10. Standalone J3 has ~10 context tags; compound has 20+. Bringing standalone to parity ~60-90 min mostly mechanical. Defer unless production traces show standalone firing often.

### P1 — Smoke gate fix (carried + still relevant)
11. **smoke.js gate position (~15 min):** `if (fail > 0) process.exit(1)` at line 1040 fires before post-line-1040 asserts. A273, A285, A313, A314, A351–A364 sit beyond the gate. Fix: move the exit check to the very end of smoke.js after the summary print. Expect to expose the pre-existing A313/A314 reds at the gate.

### P1 — PWA-A manifest fix (A313 + A314, pre-existing)
12. After the gate fix exposes them:
    - Split `manifest.json` icons into `any` + `maskable` purpose entries
    - Add `"prefer_related_applications": false`
    - Spec: PWA Android Spec (Drive `1n5-HFuzQfUA5NRH2Rxizgma6fTsU2Tb-qNTEokCo46s`)

### P1 — STANDARDS.md duplicate-rule-numbering audit (TYPE D, scheduled)
13. Four pairs of duplicate-numbered rules (39/40/41/42). Renumber-only; no deletions. Plan from AM HANDOFF.

### P1 — Documentation amendments (carried from AM)
14. Update 5 morning-sweep docs per session `1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw`
15. Update CI/Deploy Ref to document Phase C + WOW 8 Queues + JQ-5 + Axis 2 + Axis 3 Phase A + Axis 3 Phase B
16. Update JQ Spec to add JQ-ACTION-A/B/C close-out note

### P1 — BDL milestone decision (carried)
17. Upgrade BDL to GOAT plan ($9.99/mo), remove feature, OR find free alt

### P1 — Optional: extend NBA_HEAD_COACHES to MIN/NOP/UTA when verified
18. Currently omitted (graceful degradation). Restore when reverification possible.

### P2 — USPTO provisional prep (~June 25)
19. WOW 6 + Phase C + WOW 8 + JQ-3 feedback loop + JQ-5 paired action paths + Axis 3 Phase A scaffolding + **Axis 3 Phase B verified-source data layer** = stronger patent narrative (intelligence-action pairing demonstration with DO NOT INVENT discipline as a methodological signal).

### P2 — Build backlog (carried from AM)
20. handleCron refactor (~2.5 hr)
21. YouTube highlights (~45 min)
22. Podcast Index (~30 min)
23. SeatGeek (~2 hr)
24. Polymarket (~2.5 hr)
25. Preference Sync QR tier (~45 min) + Passkey tier (~2.5 hr)

### P3 — Deferred console errors (carried)
- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding (`%3E` for `>=`)
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon: smoke 241/0 pre-gate, deploys SUCCESS on `5d542e9` (Phase B 6+7+8)
- field-relay-nba: unchanged this session (STRUCTURAL 6 green, WOW 8 e2e probe done May 31)
- Pre-existing post-gate reds: A313, A314 (PWA-A) — hidden by gate position
- New post-gate green this session: A361 (coach tables), A362 (historical anchors), A363 (populateSeriesContext), A364 (inline call retirement)
- A53 strengthened — now asserts single-call-site invariant rather than legacy inline-block presence
- SW_VERSION 2026-06-01f live; covers Phase B 6+7+8
- `populateSeriesContext(g)` defined and wired into both J3 paths immediately before `buildSeriesContextTags(g)`
- `NHL_HEAD_COACHES` (32) + `NBA_HEAD_COACHES` (27, MIN/NOP/UTA omitted) tables in place
- `SERIES_HISTORICAL_ANCHORS` with verified entries for NHL_SCF_2026 + NBA_FINALS_2026
- `bdlInjuryContextSync` function retained but now has exactly one call site (inside `populateSeriesContext`)
- `buildSeriesContextTags` `[COACH:]` formatting uses `teamNick()` per HANDOFF acceptance shape
- Standalone J3 inline `bdlInjuryContextSync` call retired (replaced with explanatory comment)
- PM-1 carry: Axis 2 standalone J3 isBigGame word budget (A359) + Axis 3 Phase A scaffolding (A360) — both still live
- AM carry: JQ-5 (My Services modal), JQ-ACTION-A/B/C, TIME-PERIOD ANCHORING + SLATE BOUNDARY prose rules, WC2026 format corrections
- Brief draft artifacts (`r2_finals_briefs.md` aspirational + `r2_finals_briefs_production.md` production-shape) from PM-1 still staged — now substantially more reproducible by the live pipeline (coach + first-since-X framing layers landed)
- Subtask 9 (playoff leaders) explicitly deferred with documented next-session plan; Phase A scaffolding remains inert for playoff leaders until that feed lands; placeholder no-op block in `populateSeriesContext` reserved
