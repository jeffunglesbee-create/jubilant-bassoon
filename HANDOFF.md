# FIELD HANDOFF — June 22 2026 (updated 10:30pm ET)

## State
- CLIENT HEAD: ed0d7d2 (jubilant-bassoon) · auto-overlay 2026-06-22
- RELAY HEAD: 8dd42f7 (field-relay-nba) · backfill quality manifest
- RELAY DEPLOYED: 931fd05 (deploy/verify match:false — 8dd42f7 is docs-only [skip ci])
- Smoke: 723/3 (3 failures unidentified — not printing individual fail lines)
- SW_VERSION: 2026-06-21c

## What Shipped Since Last HANDOFF (acceac2/c5e4192)

### O(1) Newspaper (relay 64f71d7 + client db5ded4)
- Relay: GET /analytics/newspaper/{date} bundles recap (yesterday) + preview (today)
- Client: fetchNewspaper → renderNewspaper → prepends to <main> above schedule
- 11-viewport CSS coverage + WHOLE FIELD mode
- Smoke A692-A696 (source-regex pattern)
- Carry-forwards: wentToOT hardcoded false, KV editorial keys not consulted, recap nulls until 09:00 UTC cron

### Brief Archive Pipeline (relay f50fb1b + d64a9c8)
- sweepKVBriefs extracted + runs every cron tick (not just dead hours)
- game_brief backfill gate widened (skipped || ok)
- GET /backfill/game-briefs — on-demand historical backfill with ?dry=true, ?limit=N, ?force=true
- 59 game_brief rows backfilled (all completed games in D1)
- QUALITY PROBLEM: backfill briefs are low quality — thin prompt, no voice register, no quality chain. MLB briefs fixate on ABS stats. Golf/WC briefs are nameless/generic.

### CFL Schedule (client c8d62d5)
- Expanded from Week 1 only (2 games) to Weeks 1-10 (38 games, through Aug 8)
- All 9 teams, correct venues, TSN/CBSSN broadcast tags

### CC-CMDs Pushed (not yet executed)
- docs/CC-CMD-2026-06-22-backfill-prompt-quality.md — JQ_STYLE + quality chain for backfill
- docs/CC-CMD-2026-06-22-v4-register-port.md — port FIELD_VOICE_EXEMPLARS to relay
- docs/CC-CMD-2026-06-22-quality-scoring-everywhere.md — score all brief types
- docs/CC-CMD-2026-06-22-quality-auto-feedback.md — automated quality feedback loop
- docs/CC-CMD-2026-06-22-newspaper-relay.md — (already executed)
- docs/CC-CMD-2026-06-22-newspaper-client.md — (already executed)

## Known Quality Gaps

### Voice Register
- v4 register (FIELD_VOICE_EXEMPLARS) exists ONLY in client index.html
- Used by: J3 omnibus brief, compound prompt (2 surfaces)
- NOT used by: relay cron briefs, per-game card briefs, backfill, /journalism/generate
- Per-game briefs use FIELD_PROSE_STYLE (rules only, no voice palette)
- Fix: one-line port to journalism-quality.js + wire into prompt paths

### Quality Scoring
- Only 12 of 540+ briefs have quality_score (10 slate, 2 series_preview)
- game_recap, game_brief, night_owl, mlb_game, wc_matchup, wnba_game: all NULL
- runQualityChain exists but isn't called on most paths
- Analytics Engine receives data from 2 paths, nobody reads it
- Prompt Observatory (specced) never built
- Fix: wire runQualityChain into all LLM paths, scoreProse into capture paths

### Data Gaps (sport context for briefs)
- Golf: no player names in context — assembleContext returns nothing
- WNBA: no player data — assembleContext returns nothing
- WC: FBref data empty (soccer-fbref-wc.yml cron not producing)
- MLB: ABS challenge stats dominate because they're the only context
- Fix: ESPN summary data per game (requires game ID mapping)

## Probe Endpoints (all live)
- /analytics/newspaper/{date} — O(1) bundle
- /backfill/game-briefs?dry=true — archive gap check
- /journalism/context-probe — Context Assembler verification
- /budget/odds — daily + monthly spend
- /identity/mismatches — unmatched team names
- /integrity/briefs — KV vs D1 divergence
- /integrity/games — ESPN vs D1 archive gaps
- /deploy/verify — GitHub HEAD vs deployed SHA
- /freshness/{date} — brief staleness
- NOT BUILT: /health/sources, /odds-story/preview, /quality/report

## Carry-Forwards (accumulated)
1. wentToOT hardcoded false — D1 lacks column, needs GameDO write
2. KV editorial keys not consulted by newspaper endpoint
3. Recap nulls until 09:00 UTC cron fires
4. WC label mismatch: "FIFA World Cup" vs "FIFA World Cup 2026" in D1
5. WNBA archive gap: 1 game missing June 21
6. Client-side third-place at SSE speed
7. pitch_arsenals.json 0 entries (Savant CSV stale since June 15)
8. Soccer FBref wc2026.json empty
9. Smoke 723/3 — 3 failures unidentified
10. Voice register not in relay (per-game briefs have no personality)
11. Quality scoring missing on most brief types
12. Backfill briefs are low quality (need re-generation after voice fix)
13. HANDOFF.md was stale for entire June 22 session
14. Codex has 15 entries, should have 50+

## Priority (next session)
1. Port v4 register to relay + wire into all paths (one clean prompt)
2. Wire quality scoring on all brief types
3. Populate Codex with full rule set + endpoints + carry-forwards
4. Stale Data Sentinel (/health/sources)
5. Odds Story Materializer
6. ESPN summary integration for golf/WNBA/WC brief enrichment
