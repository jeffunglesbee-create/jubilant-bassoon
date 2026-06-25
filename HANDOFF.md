# FIELD HANDOFF
## Session: 2026-06-24 (end of day) · via chat + CC

---

## FIELD — Current State

**CLIENT HEAD: fa57eb0 · 2026-06-24 · L28860-sport-filter-brief-fix**
**RELAY HEAD: e6cdd36 · 2026-06-24 · deployed (e97fffd)**
Smoke: 753/0 · SW_VERSION: 2026-06-24h
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4

---

## L28860 SPORT-FILTER BRIEF FIX — SHIPPED (a50edcf / HEAD fa57eb0)

Brief was hidden entirely when any sport filter tab was active. Two root causes fixed.

| Fix | Location | Change |
|-----|----------|--------|
| Remove activeFilter gate | L28864 | `activeFilter!=='all'\|\|!sections.length` → `!sections.length` only |
| Call site passes full array | L10593 | `initFIELDBrief(filtered&&…:visible)` → `initFIELDBrief(sports)` |
| A_BR_1 reworked | smoke.js | Asserts `initFIELDBrief(sports)` — strictly stronger than prior fallback shape |
| A_BR_5 added | smoke.js | Asserts old `activeFilter` gate string is absent |
| SW_VERSION bump | both files | 2026-06-24g → 2026-06-24h (1 occurrence per file) |

State verification: both grep counts = 1, single call site at L10593 ✓
Smoke: 752 → 753/0.

---

## BRIEF ALWAYS-RENDER — SHIPPED (c8f9d3a / HEAD 7f11ee5)

Four silent failure causes fixed. Smoke 748→752/0.

| Task | Fix | Location |
|------|-----|----------|
| 1 | filtered fallback: filtered&&filtered.length?filtered:visible | L10593 |
| 2 | fieldBriefCacheKey() now uses FIELD_TZ (writer/visible/archive aligned) | L26442 |
| 3 | journalismCallsToday key: UTC→fieldDateKey(new Date()) | budget key |
| 4 | fetchFIELDBriefFromClaude bypasses _compoundRetryAfter bleed | L28696 |
| 5 | Smoke A_BR_1..A_BR_4 added | 748→752 |
| 6 | SW_VERSION 2026-06-24f → 2026-06-24g | both files |

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

## INFRASTRUCTURE

- relay deploy.yml: path filter (src/, wrangler.toml, workers/ only)
- Travelers Championship golf card: set (Jun 25-28 TPC River Highlights)
- workflow_dispatch: automatable via api.github.com — POST to
  /repos/jeffunglesbee-create/jubilant-bassoon/actions/workflows/
  drive-upload-outbox.yml/dispatches with repo+workflow scoped PAT.
  HTTP 204 = accepted. PAT stored in GitHub Actions & Cloudflare Reference doc.

---

## GENUINE OPEN ITEMS

- **wentToOT hardcoded false** (L9107) — D1 ALTER TABLE + GameDO write + backfill
- **read_codemap relay tool** — not yet built; L3 uses bash workaround until shipped
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

---

## SESSION START PROTOCOL — Rule 85 (SESSION-MEMORY-PROTOCOL-A)

Load all three layers before any work. Sessions without L3+L4 MUST NOT make
architectural decisions — mechanical edits only until both are loaded.

**L2 (two tool_search calls):**
1. tool_search("FIELD Handoff session health") → session_health + read_handoff
2. tool_search("codex commit write file source") → codex_search, read_file, commit_file, write_handoff, get_head_sha

**L3 (bash — read_file offloads to disk, never use it for CODE_MAP):**
```bash
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json" \
  | python3 -c "import json,sys; m=json.load(sys.stdin); [print(f) for f in m['functions'] if '{domain}' in f['name']]"
```
Note: read_codemap relay tool not yet built — bash is the workaround.

**L4:**
codex_search("{session domain}") — include touched domain + any neighbouring domain
whose contract the change crosses.

**Declare:** START · Type · Scope · Baseline (HEAD + drift + L3/L4 status)
First output = tool calls, no prose.
