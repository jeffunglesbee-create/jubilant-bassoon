# FIELD HANDOFF
## Session: 2026-06-24 · via chat

---

## FIELD — Current State

**CLIENT HEAD: 651c9c3 · 2026-06-23 · via CC (SW 2026-06-23c)**
**RELAY HEAD: 5b30cb4 · 2026-06-24 · deployed (5793fa4)**
Smoke: 726/0 · SW_VERSION: 2026-06-23c
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26

---

## WHAT SHIPPED THIS SESSION

### Phase 8b cleanup (5793fa4 relay)
- Deleted stale Phase 8b quality_alert writer from analytics-engine.js (45 lines)
- Threshold was 170, window was today-only — superseded by Phase 12 since deployment
- quality_alert row now sourced exclusively from Phase 12 (240/300, 7-day window)

### session_health quality threshold alignment (5793fa4 relay)
- quality.degraded: 170→240 threshold, 1-day→7-day window
- ENRICHMENT types + golf excluded (matches Phase 12 + /quality/report exactly)
- session_health, analytics_output.quality_alert, /quality/report now share same 240/300 7-day rubric
- Prior false positives (night_owl, wc_matchup) from 170 threshold on thin 1-day window will no longer fire

---

## OVERNIGHT WATCH

1. Next session_health call — quality.degraded should be empty or reflect genuine regressions (>240 threshold, 7-day)
2. Phase 12 cron tonight — quality_alert row for 2026-06-24
3. night_owl Dim 7+10 — first full day with game_id → espn_event_id chain

---

## OPEN ITEMS

### FIELD P0
- API-Sports Football Pro renewal — JUNE 29 (5 days)

### FIELD carry-forwards
- Relay [skip ci] + drive-upload gap: outbox manifests on [skip ci] commits need manual workflow_dispatch to reach Drive. Consider relay workflow fix to use `[skip deploy]` pattern instead.
- night_owl Dim 7+10 historical rows: espn_event_id NULL for Jun 16-22. Accumulates going forward.
- Rescore loop convergence: walk by type works; scored_at column optional.
- game_brief golf 106.4: structural gap, excluded from alerts.
- wentToOT hardcoded false in newspaper
- mlb_pitch_arsenals entries:0 (Savant scraper, heals Monday)
- Unexecuted CC-CMDs: Stale Data Sentinel + Odds Story Materializer (docs exist in relay repo)
- Smoke regression 724→663: root cause unknown

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
- Phase 8b Cleanup + Quality Align: cc-phase8b-cleanup-quality-align-2026-06-24.md (relay outbox)

## Drive Docs (prior sessions)
- Quality Alert Automation Phase 12: 1pGb24bPdPu_dyflIjt_Qsi6-sc4aXgYKLNcvXKw2C5Q
- 300-Point Quality Scale: 1f5eOsIdqUof6CF0HoKVcgl_hl0LhOqiI0RInvGgzZjM
- Night Owl Game ID Fix: 1yPOG89i1oB36-a8Y8f56t97TUim4DqkQkOsSDwLsg7o
- Night Owl ESPN Leaders Cold-Cache Fix: 10zbsbr73YUVfsR3ir9HEv_Q1mxurrULORP2ip-ArFGs

## Drive Specs (permanent)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Backfill Enrichment — 1Zs0fFrokCnd3D7UhTlFFykRgPHAW0_ygqgPSYyedzXI
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
7. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
8. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Hr_xmAYGIMiafRug
9. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
10. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE

## Drive upload outbox
`.github/workflows/drive-upload-outbox.yml` → folder 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
