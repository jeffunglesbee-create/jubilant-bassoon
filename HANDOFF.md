# FIELD HANDOFF — June 22 2026

## State
- CLIENT HEAD: acceac2 (jubilant-bassoon)
- RELAY HEAD: c5e4192 (field-relay-nba)
- Deploy: match=true (verified via /deploy/verify)
- Smoke: 692 client
- Adapters: 14/14 shipped, 2 specs queued

## Adapter Inventory — All 14 Shipped

1. Event Bus Consumers — CASCADE verified via live screenshots
2. CONTRACTS.md — HTTP 200 both repos
3. Codemap CI — 895 functions
4. Savant → Journalism — ABS grades ✅, pitch arsenals 0 data (Savant CSV stale)
5. Multi-Sport R2 → Journalism — NHL/NBA/Soccer builders deployed
6. Context Assembler — BUG FIXED: was reading R2 (empty), now reads GitHub outbox (commit 461faec). Verified via /journalism/context-probe + AI Gateway.
7. Sync Reconciler Phase 1 — deployed, 0 changelog entries (temporal)
8. Brief Freshness Guard — /freshness returns 80 briefs, stale:false
9. Game State Transition Hook — closing odds capture on pre→live (CC ee0488c)
10. Identity Resolver — centralized resolveTeamKey (CC 5a7902c)
11. Budget Coordinator — shared KV daily 3800, monthly 85K (CC c4056d6+d6946f9)
12. Brief Write Integrity — /integrity/briefs with auto-repair (CC a9b2264)
13. Game Archive Completeness — /integrity/games (CC a9b2264)
14. Post-Deploy Verification — /deploy/verify (CC a9b2264)

## Probe Endpoints (all live)
- /journalism/context-probe — zero-cost Context Assembler verification
- /journalism/run?force=true — bypass context hash check
- /budget/odds — daily + monthly spend
- /identity/mismatches — unmatched team names
- /integrity/briefs — KV vs D1 divergence
- /integrity/games — ESPN vs D1 archive gaps
- /deploy/verify — GitHub HEAD vs deployed SHA
- /freshness/{date} — brief staleness
- /odds-story/preview — line movement (spec ready, not built)
- /health/sources — data source freshness (spec ready, not built)

## Bugs Found + Fixed This Session
- Context Assembler R2 vs GitHub outbox mismatch (461faec)
- ODDS_HARD_LIMIT 18K→85K (0f39fdf) — actual plan is 100K/month
- AI Gateway payload logging was disabled (toggled on in dashboard)
- Bracket tree third-place used Monte Carlo instead of current standings (4e67aa5)
- WC group/third-place tables not live (SSE overlay shipped, acceac2)
- Deploy/verify match:false from CI test timeout (resolved via c5e4192)

## CC-CMD Specs Queued
- Stale Data Sentinel: docs/CC-CMD-2026-06-22-stale-data-sentinel.md
- Odds Story Materializer: docs/CC-CMD-2026-06-22-odds-story-materializer.md

## Carry-Forwards
- WC label mismatch: "FIFA World Cup" vs "FIFA World Cup 2026" in D1
- WNBA archive gap: 1 game missing June 21
- Client-side third-place at SSE speed (identified, not built)
- Prompt instruction gap: LLM receives [SAVANT CONTEXT] but doesn't reference ABS grades
- pitch_arsenals.json 0 entries (Savant CSV empty since June 15)
- Soccer FBref wc2026.json empty
- Smoke discrepancy 658 vs 720 unresolved
- Savant expansion: pitcher xERA, per-batter xBA/xSLG, sprint speed

## Priority List
1. Stale Data Sentinel + Odds Story Materializer (CC specs ready)
2. Prompt instruction gap (add ABS/arsenal reference instruction)
3. Savant data expansion (xERA, sprint speed)
4. Client-side third-place computation
5. O(1) Newspaper implementation
6. Circadian System
7. Slate-Driven Density
8. Odds Story v3 client rendering

## Memory Protocol Updates This Session
- Anchor tracks BOTH client + relay HEADs
- Session start adds probe step (/deploy/verify + /health/sources)
- Infrastructure constants captured (100K plan, 85K limit, AI Gateway config)
- Session end adds /deploy/verify probe + dual-HEAD format
