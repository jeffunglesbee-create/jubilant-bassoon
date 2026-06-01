# FIELD Handoff — June 1 2026 PM (R2 Finals briefs · J3 standalone path fix · Axis 3 Phase A scaffolding)

**jubilant-bassoon HEAD:** 34b6197 · Smoke: 241/0 pre-gate (A359 + A360 added post-gate green) · SW_VERSION 2026-06-01e
**field-relay-nba HEAD:** 0ae4c11 · Deploy: SUCCESS · STRUCTURAL 6 green · WOW 8 e2e verified (unchanged this session)
**Session Doc (PM, this session — Drive):** 12CAk9NF1hytbMlJ2JIJSvVWYMMXG_gCUdmKn3E3nH60
**Session Doc (AM — Drive):** 1_9ECU61QSWoWFOPgH9oxsCLZ11jj1E_YqZP2lWXwPG8
**WC2026 Format Corrections (READ BEFORE ANY WC BUILD):** 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks
**Brief drafts (PM session output):** `r2_finals_briefs.md` (aspirational/kitchen-sink) · `r2_finals_briefs_production.md` (production-shape)

## TIER 0 DEADLINES

- **Stanley Cup G1: June 2** — VGK @ CAR (TOMORROW)
- **NBA Finals G1: June 3** — SAS vs NYK
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM)

User opener: "start_session, open handoff doc for R2 finals narrative." After
disambiguation (Cup + NBA Finals brief copy), evolved into a 4-axis build:
brief drafts + UI examination + 2 code changes + HANDOFF documentation of
Phase B follow-up.

### R2 Finals brief drafts — two versions per Axis 1 decision

Both staged at `/mnt/user-data/outputs/`:

- **`r2_finals_briefs.md`** (kitchen-sink / aspirational). Cup J2 ~108w · Cup
  J3 ~320w · NBA J2 ~115w · NBA J3 ~290w. Team-first leads, no explicit FREE
  OTA call-out. Reference for what FIELD aspires to with richer context;
  diagnostic of what the prompt's context block currently lacks.

- **`r2_finals_briefs_production.md`** (production-shape). Cup J2 ~167w · Cup
  J3 ~234w · NBA J2 ~165w · NBA J3 ~242w. Situation-first leads, free-on-ABC
  explicit, big-game word budgets (J2 ~160, J3 200-240 / 3-4 paragraphs).
  Conformed to compound prompt (line 17296) production rules.

Both pass TIME-PERIOD ANCHORING, SLATE BOUNDARY, DO NOT INVENT, third person,
zero JQ-flagged voice/cliche. Production-shape drafts still cite playoff
scoring leaders / goalies / coaches / injuries / market lines that came from
external web research — not yet from FIELD's context block. See Phase B P0.

### Axis 2 — Standalone J3 path: honor isBigGame word budget (commit 0721c50)

`fetchFIELDBriefFromClaude` hardcoded `100-120 words. 2 short paragraphs`
regardless of stakes. Compound path (line ~17296) correctly doubled to
`200-240 words. 3-4 paragraphs.` for Conference Finals / Cup / NBA Finals
via `isBigGame`. Standalone missed the boost.

Fix: mirror the same regex `/conference finals|cf g\d|nba finals|stanley cup final|wcf|ecf/i.test(g.league||'')`
into the standalone path; derive `briefWordsJ3` ternary; interpolate into
prompt RULES line.

Smoke: +A359 (post-gate per gate-position bug in P1 item).

**Risk:** Axis 2 alone doubles word budget but with the same thin context
the standalone path currently sees, output may be padded/repetitive for
big-game briefs until Phase B lands.

### Axis 3 Phase A — buildSeriesContextTags scaffolding (commit 34b6197)

New helper `buildSeriesContextTags(game)` inserted after
`buildGameStandingsContext`. Emits four optional context tags from fields
on the game object:

| Tag | Reads from | Type |
|-----|------------|------|
| `[PLAYOFF STATS: ...]` | `game.playoffLeaders` | `Array<string>` |
| `[INJURY: ...]` | `game.injuries` | `Array<string>` |
| `[COACH: home — X; away — Y]` | `game.coaches` | `{home?, away?}` |
| `[HISTORICAL: ...]` | `game.historical` | `string` |

Behavior: empty/missing field → no tag emitted. DO NOT INVENT preserved
(strict pass-through, no fabrication). Wrapped in try/catch, silent fallback
to empty.

Wired into both prompt builders:
- `fetchFIELDBriefFromClaude` (standalone) — final element of per-game array
- `buildCompoundPrompt` (compound) — after `[GAME FLOW: ...]` volatility tag

Inert until Phase B data flows populate the optional fields. Once any flow
assigns e.g. `g.playoffLeaders = ["Marner 21 pts in 16 games"]`, the
`[PLAYOFF STATS]` tag fires with no further code change.

Smoke: +A360 (post-gate).

### SW_VERSION bump

`2026-06-01d → 2026-06-01e` in both `index.html` and `sw.js` per Rule 23
(covers Axis 2 + Axis 3 Phase A + SW bump itself).

### Decisions / rules invoked

- **"I don't know" rule** (memory recent update) — invoked when user said
  "R2 finals narrative"; asked rather than guessed Roland Garros / Round 2
- **DO NOT INVENT** — caught the "Adin Hart" → "Carter Hart" slip before v2
- **DO NOT ASSUME** (Rule 48) — discovered odds were removed from FIELD
  (smoke asserts `findOddsForGame` must not exist); flagged that market
  lines in the kitchen-sink drafts aren't reproducible from current code
- **ADR-001** — Phase B planning: hardcoded coach lookup permitted (STABLE
  within season), per-game playoff stats need a feed (COUNTERS, must not be
  hardcoded)
- **Rule 23** — SW_VERSION bumped on functional code change

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (now urgent: SW_VERSION 2026-06-01e is live)
1. **SW `2026-06-01e` active in browser**
2. **Generate / inspect a J3 brief on the live site** for tonight (June 2)
   when Cup G1 lands — verify:
   - Standalone J3 path (if it fires) produces 200-240 word output, 3-4
     paragraphs (Axis 2 effect)
   - Compound path also produces big-game output
   - Brief still empty of `[PLAYOFF STATS]`/`[INJURY]`/`[COACH]`/`[HISTORICAL]`
     tags (Phase A scaffolding inert; Phase B not yet wired)
3. **JQ-5 + post-JQ-5 browser confirmation (carried from AM):**
   - Open My Services modal — Journalism Quality section renders 5
     subsections (Aggregate / Per brief type / Voice violations / Phrases
     flagged / Session quality extension)
   - `.brief-prose-score` badge should NOT appear in main UI anywhere
   - Brief uses TIME-PERIOD ANCHORING and SLATE BOUNDARY rules
   - Score ticker chips no longer show stale FT entries (15-min pruning)

### P0 — TIER 0 game-day verification
4. **June 2 (TOMORROW):** Stanley Cup G1 VGK @ CAR — NHL endpoints + drama
   arc + journalism brief live test
5. **June 3:** NBA Finals G1 SAS vs NYK — same. Relay `/v2/games?sport=nba`
   first real-traffic

### P0 — Axis 3 Phase B: data-source wiring for buildSeriesContextTags
**(now urgent — Phase A scaffolding live and Axis 2 widened J3 word budget;
without Phase B, big-game briefs will be padded against thin context
starting tonight)**

Four independent data subtasks. Each populates one optional field that
`buildSeriesContextTags(g)` reads. Listed cheapest-first.

6. **`game.coaches` (~30 min)** — hardcoded team→coach lookup. ADR-001
   permits (STABLE within season). Format: `{home: "Brind'Amour", away: "Tortorella"}`.
   Acceptance: Cup G1 brief shows `[COACH: Hurricanes — Brind'Amour; Golden
   Knights — Tortorella]` in the prompt context.

7. **`game.historical` (~30 min)** — hardcoded series-anchor lookup for
   active championship rounds. Example:
   `{ "CAR_VGK_2026SCF": "First Cup Final for Carolina since 2006 Cup win
   over Edmonton; third Vegas Final in nine years, last championship 2023." }`.
   ADR-001 permits (STABLE data). Acceptance: J3 brief consumes the
   anchor and surfaces the "first since X" framing in lead.

8. **`game.injuries` (~60 min)** — inj feed compatible with the
   ESPN-reduction policy. NHL: try `https://api-web.nhle.com/v1/...`
   endpoints. NBA: existing `bdlInjuryContextSync` already injects an
   injury line into the compound path — coordinate to avoid double-injection
   (either retire that helper or have `buildSeriesContextTags` pass through
   it). Acceptance: Cup G1 brief context shows
   `[INJURY: Lauzon (VGK) out — upper body]`.

9. **`game.playoffLeaders` (~60-90 min)** — playoff scoring leaders feed.
   NHL: NHL Stats API skater summary endpoint with playoff gameTypeId.
   NBA: scoring leaders source TBD (BDL playoff endpoint? per-team
   aggregation from existing data?). Acceptance: Cup G1 context shows
   `[PLAYOFF STATS: Marner 21 pts in 16 games; Hall 16 pts +11; Andersen
   1.41 GAA .931 SV%]`.

After Phase B wiring, validate by inspecting the generated J3 brief —
should reach the depth of `r2_finals_briefs_production.md`.

### P0 — Hardcoded calendar flip
10. **June 11 HARD:** flip `wc26:true` in FIELD_V2_SOURCES (~5 min change)

### P1 — J3 path parity (standalone vs compound)
11. Standalone J3 (`fetchFIELDBriefFromClaude`) has ~10 context tags;
    compound (`buildCompoundPrompt`) has 20+ including `[LEAGUE]`, live
    status, ESPN leaders, pitchers, sport analytics, stat-of-day, arc, BNI,
    franchise context, live extreme, EMBER, BDL injury, ESPN stats,
    weather, WIKI, NHL/MLB live, BDL PPG leaders, BDL season stats,
    volatility. Bringing standalone to parity would require porting ~10
    tag blocks (~60-90 min mostly mechanical). Defer unless production
    traces show standalone firing often.

### P1 — Smoke gate fix (carried + now more urgent)
12. **smoke.js gate position (~15 min):** `if (fail > 0) process.exit(1)`
    at line ~1040 fires BEFORE the post-line-1040 asserts run. A273, A285,
    A313, A314, A351-A360 sit beyond that gate. Fix: move the exit check
    to the very end of smoke.js after the summary print. Expect the fix
    to expose additional hidden reds beyond the known A313/A314.

### P1 — PWA-A manifest fix (A313 + A314, pre-existing)
13. After the gate fix exposes them properly:
    - Split `manifest.json` icons into `any` + `maskable` purpose entries
    - Add `"prefer_related_applications": false`
    - Spec: PWA Android Spec (Drive `1n5-HFuzQfUA5NRH2Rxizgma6fTsU2Tb-qNTEokCo46s`)

### P1 — STANDARDS.md duplicate-rule-numbering audit (TYPE D, scheduled)
14. Four pairs of duplicate-numbered rules (39/40/41/42). Renumber-only;
    no deletions. Full plan retained from AM HANDOFF — see AM session doc.

### P1 — Documentation amendments (carried from AM)
15. Update 5 morning-sweep docs (STANDARDS / Arch Spec / JQ Spec / 10 Wow /
    Infra) per session `1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw`
16. Update CI/Deploy Ref (`1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`) to
    document Phase C + WOW 8 Queues + JQ-5 + Axis 2 + Axis 3 Phase A
17. Update JQ Spec to add JQ-ACTION-A/B/C close-out note

### P1 — BDL milestone decision (carried)
18. Upgrade BDL to GOAT plan ($9.99/mo), remove feature, OR find free alt

### P2 — USPTO provisional prep (~June 25)
19. WOW 6 + Phase C + WOW 8 + JQ-3 feedback loop + JQ-5 paired action paths
    + Axis 3 Phase A scaffolding (intelligence-action pairing demonstration)
    = stronger patent narrative.

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

- jubilant-bassoon: smoke 241/0 pre-gate, deploys SUCCESS on `0721c50` (Axis
  2) and `34b6197` (Axis 3 Phase A)
- field-relay-nba: STRUCTURAL 6 green, WOW 8 e2e probe done (May 31)
- Pre-existing post-gate reds: A313, A314 (PWA-A) — hidden by gate position
- New post-gate green: A359 (Axis 2), A360 (Axis 3 Phase A)
- SW_VERSION 2026-06-01e live; covers Axis 2 + Axis 3 Phase A
- `buildSeriesContextTags(g)` defined and wired into both J3 paths; inert
  until Phase B data flows populate `game.playoffLeaders`, `game.injuries`,
  `game.coaches`, `game.historical`
- Standalone J3 path now honors isBigGame (200-240 / 3-4 paragraphs for
  Conference Finals / Cup / NBA Finals); compound path unchanged from AM
- AM session state preserved: JQ-5 (My Services modal), JQ-ACTION-A/B/C,
  TIME-PERIOD ANCHORING + SLATE BOUNDARY prose rules, WC2026 format
  corrections — all carried forward
- Brief draft artifacts staged for next session reference:
  `r2_finals_briefs.md` (aspirational) and
  `r2_finals_briefs_production.md` (production-shape, ready when Phase B
  context arrives to make it reproducible by the live pipeline)
