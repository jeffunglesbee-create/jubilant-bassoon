# FIELD Handoff — May 30 2026 (Session 2)
**Session Type:** TYPE C (standards + infrastructure)
**HEAD:** ead9ce9
**Relay HEAD:** 3c51366
**Smoke:** 310/0 (A308)
**Deploy:** SUCCESS

## TIER 0 DEADLINES
- NBA Finals G1: June 3 (NYK at MSG) — shell needed
- World Cup 2026 Phase 1: June 11 HARD
- USPTO provisional: ~June 25

## SESSION START (next session)
1. Declare session type: A / B / C / D / E
2. `git pull && cp index.html /home/claude/index.html`
3. `node smoke.js index.html` — must be 310/0 before touching anything
4. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
5. Read STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`

## WHAT CHANGED THIS SESSION

### Standards + docs
- STANDARDS.md new canonical: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
  Rules 8 (DO NOT INVENT/RUWT), 9 (ToS), 10 (Intelligence-Action) added
- Build Session List v7.27: `1TaywA5e3NLpJLpXcQPZwDMhDG79_rXMsvIa_J_uBOfY`
  SMT-A + STREAM-A DONE, JQ-ACTION-A/B/C added, BROWSER-CONFIRM-A added
- RUWT annotation on fetchMLBTeamMomentum field paths

### MCP server (field-relay-nba)
- `/mcp` endpoint live: JSON-RPC 2.0, spec 2025-03-26
- Tools: get_ci_status, get_smoke_count, get_deploy_status, get_live_scores, get_espn_game
- GITHUB_PAT set in CF dashboard ✅
- Fixed: pre-existing `id: ,` bug in adaptHockey()
- Fixed: POST method guard — /mcp added to allowlist
- Verified live via cf-api-probe (initialize + tools/list + tools/call) ✅

### MCP in FIELD Health Panel (A308)
- Long-press ⚙ or ?debug=1 → MCP RELAY section at bottom
- Shows: smoke count + last 3 CI runs + Refresh button
- Auto-fetches 100ms after panel opens
- SMOKE-VERIFIED — browser confirmation needed

## POSTPONED INDEFINITELY
- Claude Code migration — per Jeff May 30 2026

## SMOKE-VERIFIED ONLY — BROWSER CONFIRMATION NEEDED
1. Sport voice arrays (baseball/hockey/soccer)
2. Three-part arc structure (J3 + J2)
3. _bannedExtension active evolution
4. Extra innings Night Owl fix
5. MLB vary-the-angle analytics
6. MCP health panel section (relay reachable + data displays)

## NEXT PRIORITY
1. NBA Finals G1 shell (June 3 — HARD DEADLINE)
2. [PWA-A] Android PWA fixes (~40 min)
3. [MOBILE-INTEL-A] Option A — Right Now section
4. Browser confirmation session

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- Build Session List v7.27: `1TaywA5e3NLpJLpXcQPZwDMhDG79_rXMsvIa_J_uBOfY`
- Session 1 Doc: `1j09X0Yt7PeUHu_qMXYzFioUi99MqKqxEOXZuMHEGi7w`
- Session 2 Doc: `1-APZ5UVbSXdWQ68eUXEMuIXW6mq1iQ9Nv8Xv9jh5IK4`
- Infrastructure Backlog: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`
