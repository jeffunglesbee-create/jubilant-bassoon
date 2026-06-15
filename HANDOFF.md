# FIELD Handoff — June 15 2026

**jubilant-bassoon HEAD:** `ce676fb` (score overlay fix L1+L2) · Smoke: **648/0** · SW_VERSION `2026-06-15a`
**field-relay-nba HEAD:** `0aa14d9` (unchanged)

---

## WHAT SHIPPED (June 15 session)

### Rule 59 — Claude Code trusted-but-unverified (CC-AUDIT-A)
- New STANDARDS.md rule codifying session-boundary governance for Claude Code commits
- Lighter than Rule 25 (Gemini quarantine) — no quarantine, targeted audit only
- Covers: smoke delta, feature wiring verification, no invented patterns, structural compliance
- CLAUDE.md Rule 17 cross-references Rule 59
- Three case studies documented (ADR-002 success, CSS Grid failure, championship brief partial)
- Commit: 0ac7d87

### Score Overlay Fix — Layers 1+2 (NHL SCF 0-0 bug)
- **Root cause:** api-sports.io returns NHL finals with state:final + score:null. mapV2ToESPN defaults to 0-0. No prev on page load. localStorage finals expire after game day.
- **Layer 1:** V2 merge block skips espnScores write when _scoresNull && !prev. No more false 0-0.
- **Layer 2:** hydrateEspnScoresFromFinals() scans allData.sports for games with homeScore/awayScore fields. SCF G1-G6 enriched with numeric scores.
- **Layer 3 (DEFERRED):** Relay-side KV cache for final scores. Requires field-relay-nba changes.
- Commit: ce676fb

### Smoke discrepancy diagnosed
- MCP get_smoke_count tool reads source `assert(` count (588), not runtime assertion count (648)
- FEATURE_GUARDS forEach loop generates 64 dynamic assertions from 1 source call
- HANDOFF claim of 648/0 was correct; MCP tool undercounts
- 1 expected failure: A515 (SW_VERSION date) — auto-resolves on deploy, fixed in ce676fb

## WC Status (Day 5 — June 15)
Groups A-F: 1 match played each, all results in D1
Groups G-H: open today (Spain-Cape Verde 12pm, Belgium-Egypt 3pm, Saudi Arabia-Uruguay 6pm, Iran-New Zealand 9pm)
Groups I-J: open June 16, Groups K-L: open June 17

## Known Issues (carry forward)
- **Layer 3 deferred:** Relay-side V2 score cache for null-score finals (relay repo change needed)
- ESPN WC live scores relay endpoint pending (`/soccer/fifa.world`)
- Championship context not in Night Owl relay path
- J2 inline championship wiring — CC commit a17bf8e, not yet verified (Rule 59 applies)
- V2 score overlay for WC: api-sports returns real scores (not null), but ESPN secondary source missing

## Priority Queue
1. Layer 3 relay score cache (field-relay-nba)
2. WC Groups G-L D1 seeding as matches complete
3. ESPN WC relay endpoint
4. Championship brief J2 wiring verification (Rule 59 audit)
