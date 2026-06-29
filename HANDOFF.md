# FIELD HANDOFF

## Session: 2026-06-29 · MLB Adapter Proof Phase 2 — COMPLETE

**CLIENT HEAD: 53f3787**
**SW_VERSION: 2026-06-29a**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**
**CLIENT HEAD: 53f3787** (was 536b857 before Phase 2)

---

## MLB ADAPTER PROOF — STATUS

### Phase 1 ✅ COMPLETE (2026-06-28)
Fixtures + manifest contract committed.

### Phase 2 ✅ COMPLETE (2026-06-29 08:17 UTC)

**Commit `186b4c1` — "MLB Stats API adapter proof — AVV-MLB-001 through 008 + Feature Registry"**

Files changed:
- `smoke.js` — +39 lines (8 AVV-MLB assertions)
- `index.html` — +7/-1 (Feature Registry entry + `_adapterProof` field)
- `sw.js` — SW_VERSION bumped to `2026-06-29a`

**Smoke result: 770 passed, 0 failed** (up from 692)

**AVV-MLB assertions — all 8 ✅:**
- AVV-MLB-001: adapter-proof.manifest.json exists
- AVV-MLB-002: normalizeMLBGame assigns source: 'mlb-stats' (regex, multi-space)
- AVV-MLB-003: homeScore + awayScore extracted from home/away.score
- AVV-MLB-004: parseBroadcasts sets mlbnShowcase=true for MLB Network (regex)
- AVV-MLB-005: fetchMLBFixtures tries loadMLBSlate before ESPN fallback
- AVV-MLB-006: ESPN_GOTD_SCHEDULE + espnGOTD + peacockGOTD present
- AVV-MLB-007: buildFieldHealthPanel defined
- AVV-MLB-008: 'adapter-proof-mlb-stats-api' in Feature Registry

**CC probe corrections applied:**
- AVV-MLB-002: regex `/source:\s+'mlb-stats'/` (not includes — multi-space formatting)
- AVV-MLB-004: regex `/result\.mlbnShowcase\s*=\s*true/` (same reason)
- SW_VERSION bumped to clear pre-existing A190/A515 failures

**`_adapterProof` field added to normalizeMLBGame return:**
```javascript
_adapterProof: {
  adapterId: 'mlb-stats-api',
  sourceId:  'mlb-stats-api-official',
  gamePk:    String(g.gamePk),
},
```

### Phase 3 (Not started — next session)

- `?proofAdapter=mlb-stats-api&fixture=ok` query param support
- `window.__FIELD_PROOF__` runtime object
- `data-proof` DOM attributes on rendered MLB cards
- `tests/browser/adapter-visible-value.spec.ts` (Playwright)
- `.github/workflows/adapter-visible-value.yml` (CI merge gate)
- Health heartbeat KV write

---

## PRIORITY LIST

### ⏰ CRITICAL
1. **API-Sports Football Pro renewal — JUNE 29** ⚠️ TODAY

### 🔧 MLB ADAPTER PROOF
2. Phase 3: Playwright + proof mode + CI gate (next session)

### 🔧 QUEUED CC-CMDs
3. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
4. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
5. Bosnia DB fix + identity-resolver CANONICAL map
6. team_form CONTEXT_SOURCE
7. Golf orchestrator probe (add orchestrator.pgatour.com to egress first)

### 📉 QUALITY
8. game_recap degraded (4× in session_health)
9. night_owl degraded (2×)
10. mlb_game degraded
11. Smoke 724→663 regression — root cause unknown (note: smoke now at 770 ✅)

### 📋 OPEN INCIDENTS
12. Odds Story Materializer CC-CMD — unexecuted
13. Stale Data Sentinel CC-CMD — unexecuted
14. wentToOT hardcoded false in newspaper
15. KV editorial keys not consulted by newspaper
16. NFL SPORT_TO_V2 — September 9 deadline

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 1cad397 · CLIENT 53f3787 · 2026-06-29 · MLB Phase 2 ✅ 770/0 · via chat
