# FIELD HANDOFF
## Session: 2026-06-28 · L1-L5 Bootstrap + Drive Architecture Audit + Golf Research

**CLIENT HEAD: 536b857**
**SW_VERSION: 2026-06-26b**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**
**CLIENT HEAD: 536b857**

---

## SESSION SUMMARY (June 28 — late session)

Type: Diagnostic + Research (no code changes)

Work completed:
- Full Drive search of FIELD session architecture docs (30+ docs reviewed)
- L-Cache Hierarchy shortfalls doc (1CLZGvF) read and analyzed
- L1-L5 startup protocol executed and verified
- Codex session entry written (session-2026-06-28-startup)
- Golf broadcast extraction research (FFmpeg/Tesseract, AWS Lambda cost analysis)
- AWS Lambda vs Cloudflare Workers feature comparison completed
- GolfClip accuracy claims debunked (fabricated benchmarks)
- Golf-Ball-Broadcast-Model (RyanShihabi) identified as real alternative

Output files created:
1. FFMPEG-TESSERACT-VERIFICATION-2026-06-28.md
2. CLOUDFLARE-COST-ANALYSIS-GOLF-BROADCAST-2026-06-28.md
3. GOLF-SOURCING-WITHOUT-VIDEO-PROCESSING-2026-06-28.md
4. 95-PERCENT-UNDER-145-VERIFIED-SOLUTION-2026-06-28.md
5. GOLFCLIP-VERIFICATION-REALITY-CHECK-2026-06-28.md
6. AWS-LAMBDA-FIELD-MIGRATION-ANALYSIS-2026-06-28.md
7. AWS-LAMBDA-COSTS-CORRECTED-2026-06-28.md

---

## ⚠️ NEXT SESSION: ADD orchestrator.pgatour.com TO EGRESS ALLOWLIST

The PGA Tour GraphQL orchestrator EXISTS (not NXDOMAIN) but is blocked
by sandbox egress proxy. All 403s this session were sandbox, not PGA Tour.

**Action:** Add `orchestrator.pgatour.com` to network egress settings BEFORE
starting next session. Then run:

```
python3 docs/orchestrator-probe.py
```

Script is committed at docs/orchestrator-probe.py (SHA 5433028).

---

## PRIORITY LIST

### ⏰ CRITICAL
1. **API-Sports Football Pro renewal — JUNE 29** — verify cancelled/no auto-renew
2. **WC26 R32 stub reconciliation** — wrong pairings in wc26Raw

### 🔧 QUEUED CC-CMDs
3. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
4. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md) — depends on #3

### 🔨 INFRASTRUCTURE
5. Bosnia DB fix + identity-resolver CANONICAL map
6. team_form CONTEXT_SOURCE (Drive spec v3 ready)
7. Golf orchestrator probe (add to egress first)

### 📉 QUALITY
8. game_recap degraded (4x in session_health)
9. night_owl degraded (2x)
10. Smoke regression 724→663 (filesystem-dependent assertions in MCP vs CI)

### 📋 OPEN INCIDENTS
11. Odds Story Materializer CC-CMD — unexecuted
12. Stale Data Sentinel CC-CMD — unexecuted
13. wentToOT hardcoded false in newspaper
14. KV editorial keys not consulted by newspaper
15. NFL SPORT_TO_V2 — September 9 deadline

### 🏗️ PRODUCT BACKLOG
16. Lacuna Item 1 Phase 1A: BriefContextProfile
17. Lacuna Item 4: Card Face Contract
18. Golf Path 3 (GIS-anchored via OpenGolfAPI) — Week 1
19. Golf Path 1 (broadcast OCR) — Week 2-3
20. Golf Path 2 (YOLOv8 Golf-Ball-Broadcast-Model) — Week 4+

---

## GOLF SOURCING PATHS (from this session)

- **Path 3 (GIS-anchored):** OpenGolfAPI (api.opengolfapi.org, 1K req/day free) → 85-92% accuracy. Week 1.
- **Path 1 (Broadcast OCR):** FFmpeg + Tesseract via CF Containers or Lambda → 92%+. Week 2-3.
- **Path 2 (Computer vision):** Golf-Ball-Broadcast-Model (Recall 94%, Precision 96%) on Lambda → 94-95%. Week 4+.

**AWS Lambda:** Free tier covers all FIELD golf workloads ($0/month). Hybrid strategy: Workers for real-time, Lambda for video/ML/batch.

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29

SESSION END: RELAY 1cad397 · CLIENT 536b857 · 2026-06-28 · via chat
