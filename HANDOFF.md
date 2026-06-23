# FIELD HANDOFF
## Session: 2026-06-23 · via chat (final update)

---

## FIELD — Current State

**CLIENT HEAD: 0071bea · 2026-06-23 · via CC (SW 2026-06-23c)**
**RELAY HEAD: bf4fe9d · 2026-06-23 · deployed**
Smoke: 726/0 · SW_VERSION: 2026-06-23c
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26

---

## WHAT SHIPPED THIS SESSION (complete)

### Governance
- Rules 86/87/88 in all docs (both repos): CRASH-RECOVERY-A, SELF-COMPLETE-A, CORRECT-FAST-A

### Quality scale — full 300-point implementation (a3f223b relay)
- scoreProse: Dim 7 (0→25) + Dim 10 (0→30) implemented; ceiling 245→300
- runQualityChain: opts.game + opts.matchupNote through all 9 call sites
- Layer 3b threshold 175→240; retry prompt injects game data + matchupNote
- /quality/report: below_240/above_240; single 240 alert bar; 20% failure trigger
- /backfill/brief-scores: ?rescore=true for existing 245-scale rows
- 327 rows rescored; briefs >245 confirmed (max 300 for narrative_context)

### Context assembler (field-relay-nba)
- buildESPNSummaryContext (e314c60): ESPN leaders via /espn-summary/*
- espn_event_id schema change (49599fa): both archive tables, /archive/game INSERT
- buildSoccerXGContext + buildESPNSummaryContext WC normalization fix (fbf390f)
- /archive/brief: D1 lookup adds espn_event_id fallback Try 2 (bf4fe9d)

### Client (jubilant-bassoon)
- Night Owl ESPN leaders cold-cache fallback (5cf0fea)
- Night Owl archiveBrief: passes topGame.sourceId (ESPN event ID) as game_id (0071bea)
- Alert recalibration relay (dc01e44): ENRICHMENT_TYPES, per-type thresholds
- backfill/brief-scores retroactive scoring (f883975)
- /archive/brief scoring on arrival (5c0b63e)
- Venue in backfill prompts (49599fa)

### Quality trajectory (session start → end)
| Type | Sport | Start | Final | Δ |
|---|---|---|---|---|
| game_brief | golf | 91.4 | 106.4 | +15.0 |
| game_brief | WC | 136.7 | 151.0 | +14.3 |
| game_brief | WNBA | 139.3 | 152.3 | +13.0 |
| game_brief | MLB | 159.6 | 168.4 | +8.8 |
| alert_count | — | 10 | 14* | *240 excellence bar |

---

## OVERNIGHT WATCH (check tomorrow morning)

1. **night_owl above_240** — should start incrementing as tonight's brief
   archives via topGame.sourceId → espn_event_id → Dim 7+10 fire
2. **game_brief MLB** — should climb as cron generates new briefs with
   Dims 7+10 in runQualityChain (layer 3b retry at 240 threshold)
3. **game_recap WC/MLB above_240** — cron will now retry at 240 threshold;
   expect movement from 183→200+ as Dims 7+10 fire on new generations

---

## OPEN ITEMS

### FIELD P0
- **API-Sports Football Pro renewal — JUNE 29 (6 days)**
  JQ trajectory positive. WC game_recap at 183.8. Infrastructure correct.

### FIELD carry-forwards
- night_owl Dim 7+10 for historical 52 rows: espn_event_id NULL → stays 0.
  Accumulates going forward as new games archive.
- Rescore loop convergence: walk by ?type=<X> works; add scored_at column
  if needed in a future session.
- game_brief golf 106.4: structural (no context builder). Excluded from alerts.
- wentToOT hardcoded false in newspaper
- KV editorial keys not consulted by newspaper
- mlb_pitch_arsenals entries:0 (Savant scraper, heals Monday)

### FIELD P4
- NFL SPORT_TO_V2 — Sep 9
- /backfill/game-briefs self-terminating loop

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · total: 572 companies · totalMonitored: 628

**Open:**
- iOS Safari iPad Air T1 simulator boot failure
- hiringcafe signature fix
- 4 consulting firms ATS probe
- UMMS SR spot-verify
- Apply agent dry-run
- Issue #7 partial

---

## Drive Docs (session)
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
`.github/workflows/drive-upload-outbox.yml` triggers on outbox/cc-*.md pushes
Folder: 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
