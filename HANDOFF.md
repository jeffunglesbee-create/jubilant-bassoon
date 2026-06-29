# FIELD HANDOFF

## Session: 2026-06-29 · MLB Adapter Proof Phase 3 — CC-CMD Ready

**CLIENT HEAD: 53f3787**
**SW_VERSION: 2026-06-29a**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**
**CLIENT HEAD: 53f3787**

---

## RESOLVED INCIDENTS

- ✅ **API-Sports Football Pro renewal** — CANCELLED (confirmed June 29 2026)

---

## MLB ADAPTER PROOF — STATUS

### Phase 1 ✅ COMPLETE (2026-06-28)
Fixtures + manifest committed.

### Phase 2 ✅ COMPLETE (2026-06-29)
Smoke 770/0. AVV-MLB-001 through 008 all passing.
Feature Registry entry + _adapterProof field in normalizeMLBGame.

### Phase 3 ⏳ CC-CMD READY

**File:** `docs/CC-CMD-2026-06-29-mlb-adapter-proof-phase3.md`

**CC one-liner:**
```
git pull. Read docs/CC-CMD-2026-06-29-mlb-adapter-proof-phase3.md. Run probe block first. Execute all 8 steps. Done when: npx playwright test tests/adapter-visible-value.spec.js --config=tests/adapter-proof.playwright.config.js reports 5 passed, 0 failed.
```

**What Phase 3 builds:**
1. `?proofAdapter=mlb-stats-api&fixture=ok|empty|malformed` query param in index.html
2. `_MLB_PROOF_FIXTURES` inline object (3 fixture shapes)
3. `fetchMLBSchedule` override in proof mode (returns fixture instead of live API)
4. `window.__FIELD_PROOF__` exposure after load
5. `data-proof-adapter` attribute on game card outer div
6. `tests/adapter-visible-value.spec.js` — 5 Playwright tests (AVV-PW-001 through 005)
7. `tests/adapter-proof.playwright.config.js` — Chromium, screenshot always
8. `.github/workflows/adapter-visible-value.yml` — workflow_dispatch trigger
9. 5 AVV-PW-INFRA smoke assertions added to smoke.js

**Done condition:** 5 Playwright tests pass on live app + smoke still 775+/0.

---

## PRIORITY LIST

### 🔧 MLB ADAPTER PROOF
1. **Phase 3:** Execute CC-CMD ← NEXT

### 🔧 QUEUED CC-CMDs
2. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
3. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
4. Bosnia DB fix + identity-resolver CANONICAL map
5. team_form CONTEXT_SOURCE
6. Golf orchestrator probe (add orchestrator.pgatour.com to egress first)

### 📉 QUALITY
7. game_recap degraded (4×)
8. night_owl degraded (2×)
9. mlb_game degraded

### 📋 OPEN INCIDENTS
10. Odds Story Materializer CC-CMD — unexecuted
11. Stale Data Sentinel CC-CMD — unexecuted
12. wentToOT hardcoded false in newspaper
13. KV editorial keys not consulted by newspaper
14. NFL SPORT_TO_V2 — September 9 deadline

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 1cad397 · CLIENT 53f3787 · 2026-06-29 · Phase 3 CC-CMD pushed · via chat
