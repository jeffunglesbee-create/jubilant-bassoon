# FIELD HANDOFF

## Session: 2026-06-28 · L1-L5 Bootstrap + MLB Adapter Proof Backfill Phase 1

**CLIENT HEAD: 536b857**  
**SW_VERSION: 2026-06-26b**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**  
**CLIENT HEAD: 536b857**

---

## MLB STATS API ADAPTER PROOF BACKFILL — PHASE 1 COMPLETE

**Status:** Fixtures + manifest contract created, ready for Phase 2

### Phase 1 Deliverables (This Session)

✅ **Adapter-to-Visible-Value Proof System spec** (Drive 1SqDH_BpzyoqCJREjPqlB37V05JGAAGe0kZikBfaVyXQ)  
✅ **Comprehensive backfill plan** (15-section implementation guide)  
✅ **Fixture set (3 JSON files)**
   - `mlb-stats-api.ok.json` — 2 games (NYY-BAL live 3-2, LAD-SFG pregame)
   - `mlb-stats-api.empty.json` — zero games
   - `mlb-stats-api.malformed.json` — corrupted data

✅ **Adapter proof manifest** (docs/adapter-proof.manifest.json)
   - 14 required normalized fields
   - 4 visible surfaces (card score, broadcast chips, game state, health row)
   - 2 fallback surfaces (ESPN)
   - Proof mode: required

✅ **Source registry** (docs/source-registry.json)
   - Source ID: mlb-stats-api-official
   - Status: GREEN
   - Commercial class: public_api_sports
   - CORS: true, Auth: false

✅ **Normalizer test spec** (8 assertions: ok, empty, malformed, fields, proof, broadcast)  
✅ **Playwright proof spec** (5 test scenarios: score render, chips, health, fallback, crash)  
✅ **CI gate rules** (11 merge-blocking conditions)  
✅ **Feature Registry smoke assertions** (AVV-MLB-001 through 008)  
✅ **CC-CMD handoff document** (Phase 1→2 execution plan)

### Phase 2 Tasks (Next Session)

⏳ **Normalizer tests:** tests/adapters/mlb-stats-api.normalizer.test.js  
⏳ **Playwright proof:** tests/browser/adapter-visible-value.spec.ts  
⏳ **DOM proof attributes:** data-proof, data-health-source markup  
⏳ **CI gate workflow:** .github/workflows/adapter-visible-value.yml  
⏳ **Feature Registry entry:** 'adapter-proof-mlb-stats-api': '2026-06-28'  

**Definition of Done (Phase 2):** CI summary shows MLB Stats API as PASSED, all 8 smoke assertions green.

---

## PRIORITY LIST

### ⏰ CRITICAL
1. **API-Sports Football Pro renewal — JUNE 29** ⚠️ 4 days remaining — verify cancelled/no auto-renew
2. **WC26 R32 stub reconciliation** — wrong pairings in wc26Raw

### 🔧 MLB ADAPTER PROOF (NEW)
3. **Phase 1:** ✅ Fixtures + manifest created (this session)
4. **Phase 2:** Normalizer + Playwright tests (next session, est. 2-3 hours)

### 🔧 QUEUED CC-CMDs
5. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
6. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md) — depends on #5

### 🔨 INFRASTRUCTURE
7. Bosnia DB fix + identity-resolver CANONICAL map
8. team_form CONTEXT_SOURCE (Drive spec v3 ready)
9. Golf orchestrator probe (add orchestrator.pgatour.com to egress first)

### 📉 QUALITY
10. game_recap degraded (4x in session_health)
11. night_owl degraded (2x)
12. Smoke regression 724→663 (filesystem-dependent assertions in MCP vs CI)

### 📋 OPEN INCIDENTS
13. Odds Story Materializer CC-CMD — unexecuted
14. Stale Data Sentinel CC-CMD — unexecuted
15. wentToOT hardcoded false in newspaper
16. KV editorial keys not consulted by newspaper
17. NFL SPORT_TO_V2 — September 9 deadline

### 🏗️ PRODUCT BACKLOG
18. Lacuna Item 1 Phase 1A: BriefContextProfile
19. Lacuna Item 4: Card Face Contract
20. Golf Path 3 (GIS-anchored via OpenGolfAPI) — Week 1
21. Golf Path 1 (broadcast OCR) — Week 2-3
22. Golf Path 2 (YOLOv8 Golf-Ball-Broadcast-Model) — Week 4+

---

## NEXT ADAPTER TARGETS (Priority Order)

After MLB Stats API Phase 2 completes:

1. ✅ **NBA CDN** — Current live source, clean fields
2. ✅ **NHLE** — Official live source, clear score/state
3. 🔄 **MLB Stats API** — In progress (Phase 2 next session)
4. ⏳ **Squiggle AFL / Kali AFL** — Full seasons available
5. ⏳ **BSD soccer** — WC2026 provider
6. ⏳ **Odds API** — Betting intelligence
7. ⏳ **Open-Meteo** — Weather context
8. ⏳ **SlashGolf / OpenGolfAPI** — Golf scoring
9. ⏳ **NFLverse / nflfastR** — NFL play-by-play
10. ⏳ **MoneyPuck / Cricsheet / OpenF1** — Niche sports

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29

---

## FILES TO COMMIT (PENDING)

Ready to push to jubilant-bassoon:
- docs/adapter-proof.manifest.json ← Proof contract for MLB
- docs/source-registry.json ← Source rights gate
- tests/fixtures/adapters/mlb-stats-api.ok.json
- tests/fixtures/adapters/mlb-stats-api.empty.json
- tests/fixtures/adapters/mlb-stats-api.malformed.json
- docs/CC-CMD-2026-06-28-mlb-adapter-proof.md ← Phase 2 handoff

---

SESSION END: RELAY 1cad397 · CLIENT 536b857 · 2026-06-28 · MLB Phase 1 ✅ · via chat
