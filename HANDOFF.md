# FIELD HANDOFF

## Session: 2026-06-29 · MLB Adapter Proof Phase 2 Setup

**CLIENT HEAD: 536b857**
**SW_VERSION: 2026-06-26b**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**
**CLIENT HEAD: 536b857**

---

## MLB ADAPTER PROOF — PHASE 2 STATUS

### Phase 1 (2026-06-28) ✅ COMPLETE
Fixtures + manifest contract created and committed.

### Phase 2 (2026-06-29) ✅ DOCS COMMITTED — CC-CMD READY

**Commits on main (all [skip ci]):**
- `be7cc816` — CC-CMD-2026-06-29-mlb-adapter-proof-phase2.md
- `038d981d` — docs/adapter-proof.manifest.json
- `52655e85` — docs/source-registry.json
- `1967e36c` — docs/adapter-fixtures-mlb-ok.json
- `20d96f18` — docs/adapter-fixtures-mlb-empty.json
- `eed2b2fb` — docs/adapter-fixtures-mlb-malformed.json

**HEAD after Phase 2 doc push: `eed2b2fb`**

### Phase 2 CC-CMD awaits CC execution

**File:** `docs/CC-CMD-2026-06-29-mlb-adapter-proof-phase2.md`

**CC one-liner:**
```
Read docs/CC-CMD-2026-06-29-mlb-adapter-proof-phase2.md and execute all steps. Run probe block first, then add AVV-MLB-001 through 008 smoke assertions to smoke.js, add 'adapter-proof-mlb-stats-api' to Feature Registry in index.html, add _adapterProof field to normalizeMLBGame return, run node smoke.js index.html to verify all 8 new assertions pass with exit 0, then commit and push.
```

**Done condition:** `node smoke.js index.html 2>&1 | grep -E "AVV-MLB|Results:"` shows 8 ✅ and 0 failed.

### Phase 3 (Not yet started)
- Proof mode query params (`?proofAdapter=`, `?fixture=`)
- `window.__FIELD_PROOF__` object
- `data-proof` DOM attributes on MLB cards
- Playwright test: `tests/browser/adapter-visible-value.spec.ts`
- CI merge-blocking gate: `.github/workflows/adapter-visible-value.yml`
- Health heartbeat KV write

---

## WHAT THE PHASE 2 CC-CMD DOES

1. **Probe** — confirms normalizeMLBGame fields, card selectors, smoke count
2. **docs/adapter-proof.manifest.json** — already committed ✅
3. **docs/source-registry.json** — already committed ✅
4. **smoke.js** — adds 8 AVV-MLB assertions (structural proof layer)
5. **index.html Feature Registry** — adds `'adapter-proof-mlb-stats-api': '2026-06-29'`
6. **index.html normalizeMLBGame** — adds `_adapterProof` field to return object
7. **Verifies** all 8 new assertions pass
8. **Commits + pushes** index.html + smoke.js

---

## PRIORITY LIST

### 🔧 MLB ADAPTER PROOF
1. **Phase 2:** Execute CC-CMD (docs committed, CC-CMD ready) ← NEXT
2. **Phase 3:** Playwright + proof mode + CI gate (after Phase 2 verified)

### ⏰ CRITICAL
3. **API-Sports Football Pro renewal — JUNE 29** ⚠️ TODAY — verify cancelled
4. **WC26 R32 stub reconciliation** — wrong pairings in wc26Raw

### 🔧 QUEUED CC-CMDs
5. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
6. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
7. Bosnia DB fix + identity-resolver CANONICAL map
8. team_form CONTEXT_SOURCE
9. Golf orchestrator probe (add orchestrator.pgatour.com to egress first)

### 📉 QUALITY
10. game_recap degraded (4x)
11. night_owl degraded (2x)
12. Smoke regression 724→663

### 📋 OPEN INCIDENTS
13. Odds Story Materializer CC-CMD — unexecuted
14. Stale Data Sentinel CC-CMD — unexecuted
15. wentToOT hardcoded false in newspaper
16. KV editorial keys not consulted by newspaper
17. NFL SPORT_TO_V2 — September 9 deadline

---

## NEXT ADAPTER TARGETS (after MLB Phase 2+3)

Backfill order: NBA CDN → NHLE → MLB (in progress) → Squiggle AFL → Kali AFL → BSD Soccer → Odds API → Open-Meteo → SlashGolf → OpenGolfAPI → NFLverse → MoneyPuck → Cricsheet → OpenF1

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 1cad397 · CLIENT 536b857 · 2026-06-29 · MLB Phase 2 docs ✅ · via chat
