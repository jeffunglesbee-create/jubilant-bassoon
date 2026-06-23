# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## FIELD — Current State

**CLIENT HEAD: 8661cf7 · 2026-06-23 · via CC**
**RELAY HEAD: 49599fa · 2026-06-23 · deployed**
Smoke: 726/0 · SW_VERSION: 2026-06-23b
CF account: b57e9af57ab46c52ca9215804e689c29

---

## WHAT SHIPPED THIS SESSION

### Governance (STANDARDS.md + all docs)
- Rule 86 — Crash recovery protocol (CRASH-RECOVERY-A)
- Rule 87 — CC-CMDs must be self-completing (SELF-COMPLETE-A)
- Rule 88 — Correct route, fast execution (CORRECT-FAST-A)
- All three in: STANDARDS.md, CLAUDE.md (both repos), CONTRIBUTING.md, CONTRACTS.md (both repos), docs/CLAUDE-CODE-PROMPT-RULES.md, GOVERNANCE.json, memory

### Quality infrastructure
- /quality/report alert recalibration (dc01e44): ENRICHMENT_TYPES exclusion, per-type thresholds (game_brief:130, night_owl:140, full-prose:170), golf excluded. alert_count 10→4.
- /backfill/brief-scores endpoint (f883975): retroactive scoring of 452 NULL rows
- /archive/brief POST (5c0b63e): runQualityChain wired, now scores night_owl/mlb_game/wc_matchup on arrival

### Context assembler (field-relay-nba)
- buildESPNSummaryContext added (e314c60): ESPN leaders for MLB/NBA/WNBA/NHL/WC via /espn-summary/*
- espn_event_id schema change (49599fa): ALTER TABLE on both archive tables, /archive/game INSERT persists it, backfill SELECTs include it, venue added to backfill prompts
- buildSoccerXGContext + buildESPNSummaryContext WC fix (CC-CMD 292b117): PENDING CC EXECUTION

### Client (jubilant-bassoon)
- Night Owl ESPN leaders cold-cache fallback (5cf0fea): ESPN Summary fetch in fetchNightOwlFromClaude when in-memory caches cold

### Quality results (verified live)
- game_brief MLB: 159.6 → 167.8/245 (+8.2)
- game_brief WC: 136.7 → 151.0/245 (+14.3)
- game_brief WNBA: 139.3 → 152.3/245 (+13.0)
- game_brief golf: 91.4 → 106.4/245 (+15.0)
- alert_count: 10 → 4

---

## PENDING CC-CMDS (unexecuted)

### field-relay-nba
1. `docs/CC-CMD-2026-06-23-wc-context-fix.md` (292b117) — Fix buildSoccerXGContext + buildESPNSummaryContext WC sport normalization. One-liner: `git pull. Read docs/CC-CMD-2026-06-23-wc-context-fix.md. Execute all tasks.`

### jubilant-bassoon
2. Night Owl and WC game_brief quality will improve overnight as new ESPN leaders accumulate. Check /quality/report tomorrow.

---

## OPEN ITEMS

### FIELD P0
- API-Sports Football Pro renewal — JUNE 29 DEADLINE (6 days). JQ quality improving — renewal decision gate.

### FIELD P3
- wentToOT hardcoded false in newspaper
- KV editorial keys not consulted by newspaper
- mlb_pitch_arsenals entries:0 (Savant scraper, heals Monday)
- golf/WNBA no assembleContext builder (low urgency — no active season)

### FIELD P4
- NFL SPORT_TO_V2 — Sep 9
- Phase 8b quality_alert threshold tuning — after Jun 29
- /backfill/game-briefs self-terminating loop (force=true doesn't converge — date-walking workaround)

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · total: 572 companies · totalMonitored: 628

**Open:**
- iOS Safari iPad Air T1 simulator boot failure (viewport workflow)
- hiringcafe signature fix
- 4 consulting firms ATS probe (Stoltenberg, Incisive, Evergreen, Anura)
- UMMS SR spot-verify
- Apply agent dry-run
- Issue #7 partial

---

## Drive Specs
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Backfill Enrichment — 1Zs0fFrokCnd3D7UhTlFFykRgPHAW0_ygqgPSYyedzXI
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
7. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
8. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Hr_xmAYGIMiafRug
9. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SQ0khAp0OrOfU
10. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

## Drive upload outbox
`.github/workflows/drive-upload-outbox.yml` — triggers on `outbox/cc-*.md` pushes
Apps Script bridge · Folder: 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
