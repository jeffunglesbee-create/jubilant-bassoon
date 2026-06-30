# FIELD HANDOFF

## Session: 2026-06-29 · Odds API Adapter Proof — ALL PHASES COMPLETE

**CLIENT HEAD: 1c0e797c**
**SW_VERSION: 2026-06-29e**
**RELAY HEAD: 96dea28**

---

## ADAPTER BACKFILL STATUS

| # | Adapter | Status |
|---|---------|--------|
| 1 | NBA CDN | ⏳ |
| 2 | NHLE | ⏳ |
| 3 | MLB Stats API | ✅ DONE |
| 4 | BSD Soccer | ✅ DONE |
| 5 | Squiggle AFL | ⏳ |
| 6 | Kali AFL | ✅ DONE |
| 7 | Odds API | ✅ DONE |
| 8–14 | Remaining | ⏳ |

---

## ODDS API ADAPTER — COMPLETE

### Relay (field-relay-nba)
- bef1c5c — _oddsProof in extractOddsForGame() return object
- 96dea28 — AFL + CFL added to odds_story CONTEXT_SOURCE sports filter

### Client (jubilant-bassoon)
- aaece86 — Phase 1: manifest + registry + 3 real fixtures
  - adapter-fixtures-odds-live-mlb.json (BAL vs CWS, real DraftKings data)
  - adapter-fixtures-odds-live-wc.json (NED vs MAR, 3-way h2h)
  - adapter-fixtures-odds-story-wnba.json (GSV vs NYL, opening + closing, expectedOddsStory corrected to 'closed +100')
- 1c0e797 — Phase 2: 8 AVV-ODDS assertions, Feature Registry, SW 2026-06-29e, 803/0
- 033b24a — Phase 3 outbox: 100/100, 5 factors, WNBA fixture corrected

### Key findings
- Archive lags ~24hr — use date=2026-06-28 for D1 probes, not today
- [ODDS STORY] requires BOTH opening_odds AND closing_odds — fires for completed games only
- _oddsProof absent from pre-bef1c5c D1 rows — tonight's MLB rows will be first to carry it
- Gap 2 (AFL/CFL filter): Round 17 starts July 2 — will fire automatically
- Gap 3 (archive timing): self-resolving, no code change needed

### Dropbox backup
index-2026-06-29-odds-adapter-proof.html uploaded (run 28411761628)

---

## SESSION SUMMARY — 2026-06-29 FULL DAY

### Adapters proven today (4 total, 3 new)
- MLB Stats API (all phases, carry-forward from yesterday)
- BSD Soccer (all phases + 4 relay gap fixes)
- Kali AFL (all phases + AVV workflow generalization 9/9 CI)
- Odds API (all phases + 2 relay changes + archive timing diagnosis)

### Relay gap fixes shipped today
- cd68c60 — BSD momentum route fix (extracts from /stats/ not non-existent endpoint)
- e7cc101 — situation.elapsed = BSD current_minute (live WP accuracy)
- 01b4056 — matchEvents from ESPN comp.details (goal scorers in briefs)
- 1cad397 — extractWCPhase (R32/R16/QF write to D1)
- 9fc71ac — _kaliProof in buildAFLJournalismContext
- bef1c5c — _oddsProof in extractOddsForGame
- 96dea28 — AFL + CFL in odds_story sports filter

### AVV workflow
adapter-visible-value.yml generalized (no sport suffix). 9/9 CI.
AFL describe block added — graceful skip between rounds.
When Round 17 starts July 2: AVV-AFL-001 will log DEFINITIVE SOURCE: kali-afl.

### AVV model documented
Drive: 1nvPefa5Bs_nYIuUsZiL9dwWS37z-e8vuIYxOG3ZcmOE
"FIELD — Adapter-to-Visible-Value Proof Model (June 29 2026)"

---

## SMOKE: 803/0

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
2. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
3. Bosnia DB fix + identity-resolver CANONICAL map
4. team_form CONTEXT_SOURCE v3
5. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
6. wentToOT hardcoded false
7. KV editorial keys not consulted
8. NFL SPORT_TO_V2 — September 9

### 🏗️ NEXT ADAPTER BACKFILL
NBA CDN → NHLE → Squiggle AFL → ...

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 96dea28 · CLIENT 1c0e797c · 2026-06-29 · ODDS API ✅ 803/0 · via chat
