# FIELD HANDOFF
## Session: 2026-06-24 (full day) · via chat + CC

---

## FIELD — Current State

**CLIENT HEAD: 14d08c7 · 2026-06-24 · night owl WC drama**
**RELAY HEAD: 8caf865 · 2026-06-24 · deployed (5b2ea9e)**
Smoke: 745/0 · SW_VERSION: 2026-06-24e
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4

---

## MD3 STACK — ALL SHIPPED (before 19:00 UTC)

| Item | Commit |
|------|--------|
| Group standings in WC brief prompt | bc2dc9c (relay) |
| POST /wc/matchup/cache + PRE-GAME CONTEXT injection | 39b6815 (relay) |
| _wcScenariosCache pre-population on schedule load | 1a9a079 (client) |
| alwaysEliminated → P(advance) threshold (<2%/>98%) | 1a9a079 (client) |
| Client POSTs wc26Raw matchupNotes to relay KV | a39f869 (client) |
| Permutations: draw GF fallback + Poisson fair play (Option B) | aecb909 (client) |
| Night owl WC drama sport family + preGameScore topGame fallback | 6f6bada (client) |
| assembleContext soccer→wc26 via league signal | 5b2ea9e (relay) |

---

## QUALITY CHAIN — CURRENT STATE

Layer chain: 1 → 2a → 2b → 2c → 2d → 2d-score → 2e → 2f → 2g → 2h → 3b
300-point scale, 240 excellence threshold.
Layer 2d-score: score contradiction check + leading-zero date filter.
JQ game context wired: Night Owl, MLB Brief, Stakes Brief, J2 Series, series preview.

---

## CARRY-FORWARD AUDIT (verified this session)

CLOSED — confirmed not open:
- Soccer context (FBref): ✅ ESPN xG live since June 23 (buildSoccerXGContext)
- Stale Data Sentinel: ✅ /health/sources live since June 22
- Odds Story Materializer: ✅ /odds-story/preview live June 22
- Smoke regression 724→663: ✅ currently 745/0, net positive
- assembleContext sport-label mismatch: ✅ CLOSED this session (5b2ea9e)

GENUINE OPEN ITEMS:
- **wentToOT hardcoded false** (L9107) — needs D1 schema ALTER TABLE + GameDO write + backfill. No CC-CMD yet.
- **relay deploy.yml no path filter** — outbox commits trigger relay redeploy; [skip ci] required; blocks auto drive-upload. Fix: add path filter excluding docs/ outbox/. jubilant-bassoon already path-filtered.
- field_smoke.js L26546 pre-existing lint — low priority

---

## BRACKET COMPOUND STATUS

| Phase | Status |
|-------|--------|
| 1: bracket_snapshots + replay | ✓ |
| 2: elimination traps + /wc/elimination-traps | ✓ |
| 3: findBracketImpact + CONTEXT_SOURCES | ✓ |
| 4: bracketTriggeredBy wired to WC queue | ✓ |
| 4b: named states + TRAP chip + elim display (client) | ✓ |
| Debrief buildBracketImpact (client renderer) | Pending first live [BRACKET IMPACT] confirmation |

---

## OPEN ITEMS

### FIELD P0
- API-Sports Football Pro renewal — **JUNE 29 (5 days)**

### FIELD genuine carry-forwards
- wentToOT hardcoded false (L9107) — D1 schema + GameDO + backfill
- relay deploy.yml path filter — fixes auto drive-upload (one workflow change)

### FIELD P4
- NFL SPORT_TO_V2 — September 9
- Client buildBracketImpact Debrief renderer (after first live result)

---

## TONIGHT WATCH

Groups B (3 PM ET), C (6 PM ET), A (9 PM ET) MD3 finales.
First full-stack WC brief test: writeWCResult → PRE-GAME CONTEXT + STANDINGS + EVENTS → [BRACKET IMPACT] → 2d-score → runQualityChain.
Night_stars stale until tomorrow 5 AM ET cron (Group A finishes 3 AM UTC).
Travelers Championship R1 tomorrow June 25 — golf card set.

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · 572 companies
**Open:** iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Specs (permanent)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
7. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Jr_xmAYGIMiafRug
8. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
9. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

## Drive upload outbox
`.github/workflows/drive-upload-outbox.yml` → folder 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
