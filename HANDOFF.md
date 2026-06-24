# FIELD HANDOFF
## Session: 2026-06-24 (full day) · via chat + CC

---

## FIELD — Current State

**CLIENT HEAD: a3b0740 · 2026-06-24 · WC debrief renderer**
**RELAY HEAD: e6cdd36 · 2026-06-24 · deployed (e97fffd)**
Smoke: 748/0 · SW_VERSION: 2026-06-24f
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4

---

## BRACKET COMPOUND — FULLY CLOSED

| Phase | Commit |
|-------|--------|
| 1: bracket_snapshots + replay | ffe6911 |
| 2: elimination traps | 9340960 |
| 3: findBracketImpact + CONTEXT_SOURCES | 9340960 |
| 4: bracketTriggeredBy wired to WC queue | ddf6527 |
| 4b: named states + TRAP chip + client display | 94a203b |
| Pre-snapshot write fix (was silently empty) | e97fffd |
| findBracketImpact dual-key query | e97fffd |
| Debrief renderer (.wc-bracket-impact-card) | 55cef28 |

---

## MD3 STACK — ALL SHIPPED (before 19:00 UTC)

| Item | Commit |
|------|--------|
| Group standings in WC brief prompt | bc2dc9c |
| POST /wc/matchup/cache + PRE-GAME CONTEXT | 39b6815 |
| _wcScenariosCache pre-population | 1a9a079 |
| alwaysEliminated → P(advance) threshold | 1a9a079 |
| Client POSTs wc26Raw matchupNotes to KV | a39f869 |
| Permutations: draw fallback + Poisson FP | aecb909 |
| Night owl WC drama + topGame fallback | 6f6bada |
| assembleContext soccer→wc26 league signal | 5b2ea9e |

---

## CARRY-FORWARDS AUDITED — CLOSED THIS SESSION

- Soccer/FBref: ✅ ESPN xG live since June 23
- Stale Data Sentinel: ✅ live since June 22
- Odds Story Materializer: ✅ live since June 22
- Smoke regression 724→663: ✅ 748/0 net positive
- assembleContext sport-label mismatch: ✅ 5b2ea9e
- relay [skip ci] + drive-upload: ✅ path filter added (02f4a85); auto-fires verified

---

## INFRASTRUCTURE

- relay deploy.yml: path filter added (src/, wrangler.toml, workers/ only)
  Outbox commits no longer need [skip ci] — drive-upload auto-fires on push
- Travelers Championship golf card: set (Jun 25-28 TPC River Highlands)

---

## GENUINE OPEN ITEMS

- **wentToOT hardcoded false** (L9107) — D1 ALTER TABLE + GameDO write + backfill
- NFL SPORT_TO_V2 — September 9
- API-Sports Football Pro renewal — **JUNE 29**

---

## ALL-STAR SELECTOR — JULY 6 TARGET

**Spec:** Locked June 24. Full CC-CMD in chat history (session: "all-star baseball").

**Methodology:**
- Primary: ESPN composite WAR (confirmed includes defense + position)
- Secondary: OPS (batters) / ERA+WHIP (pitchers) as tiebreaker within 0.3 WAR
- Traditional stats (AVG, HR, RBI) as narrative labels only
- Fan vote starters accepted as-is — FIELD selects reserves + pitchers only
- One rep per team enforced. 32 per league (20 pos, 12 pitchers, ≥3 RP).

**Data source verified June 24:**
- `https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/statistics/byathlete?season=2026&seasontype=2&category=batting&limit=100&page=N`
- Batting cols (0-16): GP, AB, R, H, AVG, 2B, 3B, HR, RBI, TB, SB, SO, BB, OBP, SLG, OPS, WAR
- Pitching: ERA=[3], IP=[8], K=[13], WHIP=[15], WAR=[16]
- ESPN batting WAR is composite (offense+defense+position) — do NOT add DWAR separately
- Fielding endpoint DWAR unreliable (FP=1.000 all players) — ignore

**Key finding June 24:** Rafaela .766 OPS → 3.5 WAR (CF premium), Yordan 1.076 OPS → 3.9 WAR (DH penalty). WAR does the defensive work already.

**Execution sequence (July 6):**
1. Fan vote starters announced July 2 — hardcode from official MLB announcement
2. Official rosters announced ~5 PM ET July 6 — hardcode for comparison
3. `node scripts/allstar-selector.js` → JSON output
4. Write to KV: `wrangler kv key put allstar:2026:picks`
5. Verify `.allstar-selector-card` renders in PWA
6. Commit: `feat: All-Star Selector — FIELD picks vs official roster 2026`

**Deliverables:**
- `scripts/allstar-selector.js` — new file, standalone Node.js
- `.allstar-selector-card` section in `index.html` — same pattern as `.wc-bracket-impact-card`
- KV key `allstar:2026:picks` — one-time write, no cron

**Do NOT wire into nightly pipeline, JQ chain, or journalism prompts.**

---

## ALL-STAR EDITORIAL BRIEF TYPE — SEPARATE CARRY-FORWARD

**Target:** Build before MLB All-Star Game July 14. Separate session from selector.
**Scope:** Sport-agnostic. Applies to MLB, NBA, NHL, Pro Bowl, any exhibition.

**Problem (verified June 24):**
- MLB Stats API uses `gameType: "A"` for All-Star Game. Daily brief workflow does
  not filter on gameType — All-Star Game flows into MLB_COUNT and MLB_GAMES_JSON
  as a regular game.
- Standard JQ chain (Drama/Closeness/Plot) breaks structurally on exhibition games:
  no standings implications → Drama floors; pitchers throw 1-2 innings → game
  pattern unrecognizable; no rivalry/playoff context → Plot has nothing to work with.
- Home Run Derby does NOT appear in statsapi.mlb.com at all — not a game.
  Current pipeline: complete silence on July 13.

**Solution:**

1. **Detection guard in journalism queue consumer:**
   - MLB: detect `gameType: "A"` in Stats API response
   - NBA: detect equivalent exhibition flag (verify field name at build time)
   - NHL: same
   - Set `briefType: "allstar_game"` — skip standard JQ chain entirely

2. **`allstar_game` brief type — new editorial prompt:**
   Different questions than a regular game brief:
   - Regular game: did this matter, who was the story, how close was it?
   - All-Star game: who showed out on the biggest stage, which moments will be
     remembered, what does this reveal about the sport's stars right now?

   Grades replace Drama/Closeness/Plot with:
   - **Star Power** — did the marquee names deliver?
   - **Moment Quality** — was there a defining moment? (walk-off, 100mph FB, etc.)
   - **Representation** — did the right players make the case for their sport?

   Framing is showcase, not stakes. No standings language. No clutch/pressure framing.
   Historical context encouraged — "first time since...", "youngest player to..."

3. **Home Run Derby — static editorial card (July 13):**
   Same pattern as Travelers golf card. Pre-written, KV-stored, rendered on July 13.
   Contents: participants, format explainer, FIELD pick to win, historical notes.
   No pipeline. No score. Manual write before July 13.
   KV key: `allstar:2026:hrd`

**Build sequence (separate session, target ~July 10-12):**
1. Read journalism queue consumer — find where briefType is set
2. Add gameType: "A" guard → briefType: "allstar_game"
3. Write allstar_game prompt template (exhibition framing, 3 new grades)
4. Wire into runQualityChain with allstar_game branch
5. Write HRD static card to KV
6. Smoke: verify allstar_game brief type doesn't break regular mlb_game path

**Do NOT build before June 29. Do NOT touch JQ chain until selector is shipped.**

---

## TONIGHT

Groups B (19:00), C (22:00), A (01:00 UTC) MD3 finales.
First full-stack WC brief: PRE-GAME CONTEXT + STANDINGS + EVENTS + [BRACKET IMPACT] → 2d-score.
First live debrief card (.wc-bracket-impact-card) after game goes final.
Night_stars stale for Group A (finishes 3 AM UTC → heals tomorrow 5 AM ET cron).

---

## STAT

HEAD: 2d18fff · 572 companies
Open: iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Specs (permanent)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8pvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
7. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Jr_xmAYGIMiafRug
8. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
9. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

## SESSION START PROTOCOL
Call session_health MCP tool first.
