# FIELD HANDOFF
## Session: 2026-06-23–24 · via chat (FINAL)

---

## FIELD — Current State

**CLIENT HEAD: 0071bea · 2026-06-23 · via CC (SW 2026-06-23c)**
**RELAY HEAD: a75f3c4 · 2026-06-24 · deployed (match: true)**
Smoke: 726/0 · SW_VERSION: 2026-06-23c
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26

---

## WHAT SHIPPED THIS SESSION (complete)

### Governance
- Rules 86/87/88 in all docs (both repos): CRASH-RECOVERY-A, SELF-COMPLETE-A, CORRECT-FAST-A
- Behavior Rule 5: proactive gap surfacing — Claude must surface automation
  gaps and next actions after every CC-CMD, not wait to be asked

### Quality scale — full 300-point implementation (a3f223b relay)
- scoreProse: Dim 7 (0→25) + Dim 10 (0→30) implemented; ceiling 245→300
- runQualityChain: opts.game + opts.matchupNote through all 9 call sites
- Layer 3b threshold 175→240; retry prompt injects game data + matchupNote
- /quality/report: below_240/above_240; single 240 alert bar; 20% failure trigger
- /backfill/brief-scores: ?rescore=true for existing 245-scale rows
- 327 rows rescored; briefs >245 confirmed (max 300 for narrative_context)

### Quality automation (a75f3c4 relay)
- Phase 12 runPhase12QualityAlert() in analytics-engine.js
- Daily 9AM UTC: queries 7-day briefs window, writes quality_alert to analytics_output
- Newspaper bundle.quality_alert now auto-populated — zero manual probing needed
- Verified: quality_alert_2026-06-23 row exists, alert_count 14, newspaper populated

### Context assembler (field-relay-nba)
- buildESPNSummaryContext (e314c60): ESPN leaders via /espn-summary/*
- espn_event_id schema change (49599fa): both archive tables, /archive/game INSERT
- WC normalization fix (fbf390f): buildSoccerXGContext + buildESPNSummaryContext
- /archive/brief D1 lookup: espn_event_id fallback Try 2 (bf4fe9d)

### Client (jubilant-bassoon)
- Night Owl ESPN leaders cold-cache fallback (5cf0fea)
- Night Owl archiveBrief: topGame.sourceId as game_id (0071bea)

---

## OVERNIGHT WATCH (check tomorrow morning)

1. night_owl above_240 — first test of full game_id → espn_event_id chain
2. game_brief MLB — Dims 7+10 fire on new cron-generated briefs
3. Phase 12 quality_alert row for 2026-06-24 — confirms daily automation
4. game_recap WC/MLB — Layer 3b retry at 240 threshold

---

## OPEN ITEMS

### FIELD P0
- API-Sports Football Pro renewal — JUNE 29 (5 days)

### FIELD carry-forwards
- Phase 8b cleanup (analytics-engine.js L1492-1529): redundant writer for
  quality_alert, threshold 170 (stale). Phase 12 INSERT OR REPLACE supersedes
  it but cleanup reduces confusion. Next analytics-engine session.
- night_owl Dim 7+10 historical rows: espn_event_id NULL for Jun 16-22.
  Accumulates going forward.
- Rescore loop convergence: walk by type works; scored_at column optional.
- game_brief golf 106.4: structural gap, excluded from alerts.
- wentToOT hardcoded false in newspaper
- mlb_pitch_arsenals entries:0 (Savant scraper, heals Monday)

### FIELD P4
- NFL SPORT_TO_V2 — Sep 9
- /backfill/game-briefs self-terminating loop

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · total: 572 companies · totalMonitored: 628

**Open:** iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Docs (session)
- Quality Alert Automation Phase 12: 1pGb24bPdPu_dyflIjt_Qsi6-sc4aXgYKLNcvXKw2C5Q
- 300-Point Quality Scale: 1f5eOsIdqUof6CF0HoKVcgl_hl0LhOqiI0RInvGgzZjM
- Night Owl Game ID Fix: 1yPOG89i1oB36-a8Y8f56t97TUim4DqkQkOsSDwLsg7o
- Night Owl ESPN Leaders Cold-Cache Fix: 10zbsbr73YUVfsR3ie9HUv_X1mxurrULORP2ip-ArFGs

## Drive Specs (permanent)
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
`.github/workflows/drive-upload-outbox.yml` → folder 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
