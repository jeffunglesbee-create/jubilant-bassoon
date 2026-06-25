# FIELD HANDOFF
## Session: 2026-06-24 (full day) · via chat + CC

---

## FIELD — Current State

**CLIENT HEAD: 7f11ee5 · 2026-06-24 · brief-always-render**
**RELAY HEAD: e6cdd36 · 2026-06-24 · deployed (e97fffd)**
Smoke: 752/0 · SW_VERSION: 2026-06-24g
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

## MD3 STACK — ALL SHIPPED

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

## BRIEF ALWAYS-RENDER — SHIPPED (c8f9d3a / HEAD 7f11ee5)

Four silent failure causes fixed. Smoke 748→752/0.

| Task | Fix | Location |
|------|-----|----------|
| 1 | filtered fallback: filtered&&filtered.length?filtered:visible | L10593 |
| 2 | fieldBriefCacheKey() now uses FIELD_TZ (writer/visible/archive aligned) | L26442 |
| 3 | journalismCallsToday key: UTC→fieldDateKey(new Date()) | budget key |
| 4 | fetchFIELDBriefFromClaude bypasses _compoundRetryAfter bleed | L28696 |
| 5 | Smoke A_BR_1..A_BR_4 added (A_BR_4 comment reworded per Rule 77) | 748→752 |
| 6 | SW_VERSION 2026-06-24f → 2026-06-24g | both files |

Probe findings: CASE A — visible reader already symmetric with writer via
fieldBriefCacheKey(); only archive reader at L13444 needed alignment.
budget.inc() symmetric at L28814 — no missing increment.

CI: Deploy gate + Desktop Chrome + Desktop Safari all green on c8f9d3a.

**Secondary finding — next CC-CMD candidate:**
L28860 hides brief entirely when any sport filter is active.
Not touched in this session. Separate CC-CMD required.

---

## CARRY-FORWARDS — CLOSED THIS SESSION

- Soccer/FBref: ✅ ESPN xG live since June 23
- Stale Data Sentinel: ✅ live since June 22
- Odds Story Materializer: ✅ live since June 22
- Smoke regression 724→663: ✅ 752/0 net positive
- assembleContext sport-label mismatch: ✅ 5b2ea9e
- relay [skip ci] + drive-upload: ✅ path filter added (02f4a85)
- drive-upload workflow_dispatch: ✅ automatable via api.github.com (204 confirmed)
- Brief render diagnosis: ✅ four root causes found and fixed

---

## INFRASTRUCTURE

- relay deploy.yml: path filter (src/, wrangler.toml, workers/ only)
- Travelers Championship golf card: set (Jun 25-28 TPC River Highlights)
- workflow_dispatch: automatable via api.github.com — POST to
  /repos/jeffunglesbee-create/jubilant-bassoon/actions/workflows/
  drive-upload-outbox.yml/dispatches with repo+workflow scoped PAT.
  HTTP 204 = accepted. PAT stored in GitHub Actions & Cloudflare Reference doc.

---

## GENUINE OPEN ITEMS

- **L28860 sport-filter hides brief** — brief hidden when sport filter active — next CC-CMD
- **wentToOT hardcoded false** (L9107) — D1 ALTER TABLE + GameDO write + backfill
- NFL SPORT_TO_V2 — September 9
- API-Sports Football Pro renewal — **JUNE 29**

---

## ALL-STAR SELECTOR — JULY 6 TARGET

Methodology: ESPN composite WAR primary (confirmed composite June 24).
OPS/ERA+WHIP tiebreaker within 0.3 WAR. Traditional stats narrative only.
Fan vote starters accepted. One rep per team. 32 per league (20 pos, 12 pitchers).

Data verified: byathlete endpoint, batting cols 0-16 (WAR=[16]),
pitching ERA=[3] IP=[8] K=[13] WHIP=[15] WAR=[16].

Execution July 6: fan starters July 2, official rosters July 6 ~5 PM ET.
Deliverables: scripts/allstar-selector.js + .allstar-selector-card + KV allstar:2026:picks.
Do NOT wire into pipeline, JQ chain, or journalism prompts.

---

## ALL-STAR EDITORIAL BRIEF TYPE — ~JULY 10-12

gameType:"A" guard → briefType:"allstar_game" → skip JQ chain.
Grades: Star Power / Moment Quality / Representation.
HRD static card → KV allstar:2026:hrd by July 13.
Do NOT build before June 29.

---

## SW ARCHITECTURE (verified June 24)

Two caches: SHELL_CACHE (SWR for /index.html), API_CACHE (network-first for isAPI).
isAPI: site.api.espn.com, open-meteo.com, api.sportsdb, api.the-odds,
fantasy.premierleague, statsapi.mlb.com.
Relay NOT in isAPI — all relay calls direct network, no cache, no fallback.
Brief-fetch failures are silent (no SW visibility).

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
