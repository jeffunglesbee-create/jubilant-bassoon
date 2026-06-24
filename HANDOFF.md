# FIELD HANDOFF
## Session: 2026-06-24 · via chat

---

## FIELD — Current State

**CLIENT HEAD: 651c9c3 · 2026-06-23 · via CC (SW 2026-06-23c)**
**RELAY HEAD: f5a73c7 · 2026-06-24 · deployed (9340960)**
Smoke: 726/0 · SW_VERSION: 2026-06-23c
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26

---

## WHAT SHIPPED THIS SESSION (relay only)

### Phase 8b cleanup + session_health alignment (5793fa4)
- Phase 8b stale quality_alert writer deleted from analytics-engine.js
- session_health quality.degraded: threshold 170→240, window 1-day→7-day
- All surfaces (session_health, /quality/report, Phase 12) now share 240/300 rubric

### Bracket Snapshots — Phase 1 (ffe6911)
- bracket_snapshots table in field-archive D1 (team, date, r32/r16/qf/sf/final/champion prob)
- POST /archive/bracket-snapshot: BracketDO batch-insert after every recompute (fire-and-forget)
- GET /archive/bracket-replay: ?team / ?date / ?triggered_by / ?since / index
- BracketDO step 10 hook wired; initial 48-team backfill written (June 24 baseline)
- Calibration window for knockout rounds opens here

### Bracket Traps + Debrief Context — Phase 2+3 (54f668f + 9340960)
- detectEliminationTraps(): idle-team vulnerability from today's same-group games
- GET /wc/elimination-traps: live trap scan (proxy approx, 0.70/game)
- findBracketImpact(env, triggeredBy): reads bracket_snapshots for pre/post pChamp delta
- advancementState() helper: THROUGH/STRONG/ALIVE/DANGER/LIFE SUPPORT/ELIMINATED
- bracket_impact CONTEXT_SOURCE (wc26, priority 4): emits [BRACKET IMPACT] per state transition
- path_traps CONTEXT_SOURCE (wc26, priority 4): emits [TRAP CONTEXT] — live on /journalism/context-probe
- Hotfix 9340960: team name matcher widened to compare short codes + fifaCode

### Infrastructure
- APPS_SCRIPT_URL + APPS_SCRIPT_SECRET set on field-relay-nba repo
- 14 relay outbox manifests backfilled to Drive (all from Jun 22-24)

---

## LIVE SIGNALS (as of session end)

- Path traps: 9 active. Netherlands +2.7% largest.
- Elimination traps: 0 active today (5 games, no idle teams crossing 15% threshold)
- [TRAP CONTEXT] firing on QAT@BIH, CAN@SUI, HAI@MAR in journalism context
- bracket_snapshots: 1 row per team (June 24 baseline). Grows with each result.

---

## OPEN ITEMS

### FIELD P0
- API-Sports Football Pro renewal — JUNE 29 (5 days)

### FIELD carry-forwards
- bracket_impact won't populate until BracketDO writes pre/post snapshots with
  triggered_by={home}_{away}_{date} AND WC brief path passes it as triggeredBy. Phase 4.
- path_traps surfaces 1% swings — consider min-delta filter (≥3%) to reduce noise
- relay [skip ci] + drive-upload: manifests on [skip ci] commits need manual dispatch
- night_owl Dim 7+10 historical rows: espn_event_id NULL for Jun 16-22
- wentToOT hardcoded false in newspaper
- mlb_pitch_arsenals entries:0 (Savant scraper, heals Monday)
- Unexecuted CC-CMDs: Stale Data Sentinel + Odds Story Materializer (docs in relay repo)
- Smoke regression 724→663: root cause unknown
- Soccer context empty (FBref block) — CC-CMD exists at docs/CC-CMD-2026-06-23-soccer-fbref-fetch.md

### FIELD P4
- NFL SPORT_TO_V2 — Sep 9
- Client-side bracket Debrief integration (jubilant-bassoon CC-CMD needed)

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · total: 572 companies · totalMonitored: 628

**Open:** iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Docs (session)
- Phase 8b Cleanup + Quality Align: cc-phase8b-cleanup-quality-align-2026-06-24.md
- Bracket Snapshots Phase 1: cc-bracket-snapshots-2026-06-24.md
- Bracket Traps + Debrief Phase 2+3: cc-bracket-traps-debrief-2026-06-24.md

## Drive Specs (permanent)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Backfill Enrichment — 1Zs0fFrokCnd3D7UhTlFFykRgPHAW0_ygqgPSYyedzXI
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
7. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
8. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Jr_xmAYGIMiafRug
9. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
10. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

## Drive upload outbox
`.github/workflows/drive-upload-outbox.yml` → folder 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
