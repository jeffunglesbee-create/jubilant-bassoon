# FIELD HANDOFF

## Session: 2026-06-29 · MLB Stats API — FULLY CONFIRMED

**CLIENT HEAD: 4eb5c65**
**SW_VERSION: 2026-06-29a**

---

## MLB STATS API — DEFINITIVE PROOF COMPLETE ✅

```
[AVV-PW-006] DEFINITIVE SOURCE: mlb-stats
```

**Smoke:** 776/0
**CI Playwright:** 7/7 passed (run 28384125710)
**Confidence:** 100/100

### What was proven today (full chain)

1. **R1** — MLB Stats API returns HTTP 200, 13 games, real broadcast/linescore data
2. **R2** — 12/15 endpoints return 200; 3 require live/final game state
3. **R3** — 14/15 confirmed with completed gamePk; game_decisions deprecated (use GUMBO liveData.decisions)
4. **C1** — normalizeMLBGame reads 19 fields, all present in real API; `d→date` bug fixed
5. **C2** — 6/15 endpoints CONSUMED by client; 9/15 not referenced (backlog)
6. **C3** — `_adapterProof` doesn't survive render pipeline; card schema has 18 keys, none are source
7. **C4** — `_dataSource: game.source || null` added to card schema + `window._mlbDataReady` sentinel
8. **CI** — `[AVV-PW-006] DEFINITIVE SOURCE: mlb-stats` confirmed from live production app

### Key architectural finding

The render pipeline strips `source` and `_adapterProof` from normalized game objects.
Proof mode tests (AVV-PW-001/003) read `window.__FIELD_PROOF__.normalizedObjects` which
is pre-transformation, so they see `_adapterProof`. The live path did not — until the
`_dataSource` fix. This gap applies to ALL adapters, not just MLB.

### Commits today

- `186b4c1` — Phase 2: AVV-MLB-001–008 smoke assertions + Feature Registry
- `8636978` (bd9bb2f) — Phase 3: proof mode + Playwright 5/5
- `39e35ef` — package-lock.json regenerated (npm ci fix)
- `005d740` — C1: fetchMLBSchedule d→date bug + real fixture
- `17c1075` — _dataSource carry + _mlbDataReady sentinel
- `4eb5c65` — FINAL confirmation report (100/100)

---

## NEXT: MLB Render Pipeline Audit

CC-CMD ready: `docs/CC-CMD-2026-06-29-mlb-render-audit.md`

Analysis only — reads parseBroadcasts, MLB_TEAM_RSN, Peacock logic, standings,
and maps card fields to sources. Identifies where MLB Stats API fields can
replace manual logic. Output is a Drive doc.

---

## PRIORITY LIST

### 🔧 MLB
1. ✅ Source confirmed (mlb-stats, 100/100)
2. ⏳ Render pipeline audit (simplification opportunities)

### 🔧 QUEUED CC-CMDs
3. Relay: /journalism/game-lines
4. Client: card brief line

### 🔨 INFRASTRUCTURE
5. Bosnia DB fix + identity-resolver CANONICAL map
6. team_form CONTEXT_SOURCE v3
7. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
8. wentToOT hardcoded false
9. KV editorial keys not consulted
10. NFL SPORT_TO_V2 — September 9

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 1cad397 · CLIENT 4eb5c65 · 2026-06-29 · MLB CONFIRMED mlb-stats 100/100 · via chat
