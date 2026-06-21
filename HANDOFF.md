# FIELD HANDOFF — June 21 2026

## State
- Client HEAD: `4cde516` (codemap CI fix + auto-generated CODE_MAP.json)
- Relay HEAD: `e4e5c54` (CONTRACTS.md + odds pipeline + bracket bridge)
- Smoke: 720/1 (A704 HANDOFF format pre-existing)
- SW: 21a
- Rules: 1-86 (Rule 86 = CONTRACT-READ-A)
- CONTRACTS.md: 10 contracts, synced in both repos
- L-Cache: L1 ✅ L2 ✅ L3 ✅ (CODE_MAP.json live) L4 ✅ (12 codex entries) L5 ✅

## Shipped This Session (cont.)

### L3 Codemap Fix
- codemap.yml: git add before git diff --staged (was checking untracked file)
- CODE_MAP.json now generates on every push: 893 functions, 702 sections, 132 constants, 170 boot calls
- Commit: 71adfa8 → CI auto-committed CODE_MAP.json → HEAD 4cde516

### Session Protocol Update
- Memory edit #17 updated to include Rule 85 L3+L4 steps
- L-Cache full audit completed: all layers operational

### Adapter Audit + Specs (2 new Drive specs)
- Full 13-adapter inventory verified against June 21 session docs
- HANDOFF was missing #6 (Sync Reconciler) and #7 (Savant → Journalism) — restored
- Sync Reconciler upgraded from data plumbing to O(1) Newspaper changelog engine
- Savant → Journalism specced standalone; pitcher xERA gap identified
- Codemap CI bug (#13) fixed this session

## Shipped Earlier This Day

### Odds Infrastructure (10 relay commits, sandbox push)
- /d1/execute relay endpoint (table allowlist, auth header)
- Odds backfill routed through relay Worker binding (D1 403 fixed)
- Budget calc fixed (monthly ≠ daily)
- Backfill extended to May 9 (full archive)
- Sync: odds_history → game table opening_odds + closing_odds
- Result: 130 opening_odds + 124 closing_odds (from 10/0)

### Event Bus — Relay (CC session)
- AmbientDO → BracketDO live WC score forwarding
- BracketDO /bracket/live-score provisional Monte Carlo
- 30s cooldown, transient snapshots, name-mismatch fallback

### Event Bus — Client (CC session)
- Pulse Chip: getPulseChip with 4 signal types (⚡🔥📊⚾)
- CASCADE narrative: cross-group ripple effects on bracket tab
- WC mini-card: sticky panel for simultaneous group games
- _sseScoreTs migrated to {type, ts, data?}

### Contract Alignment
- bracket:updated shifts field aliases (team=name, pChampDelta)
- CONTRACTS.md pushed to both repos (10 contracts)
- Rule 86 (CONTRACT-READ-A) in both CLAUDE.md files

### NBA Clutch Fix (prompt written, not executed)
- CC-CMD-nba-clutch-fix.md ready

## Drive Specs Written (15)
- O(1) Newspaper v2: 17hGuvozh3a8XNCNSnqCEQfkNUeXoA8lTpVuWsZjkWjE
- Circadian Revised: 1KkpQtzHIM-sKHsWTON-VohAbTkEsnNeCShXsfSPiQiA
- Slate-Driven Density: 1zkPJIBVkKoYlwXJkoJh6oXvoufuf4Crux8JqFdTkXc0
- Odds Story v3: 1L5lDV3UGP5LQDQarT6zS8mPqy8pILeWmMmA6yIl4UY8
- Context Dimensions Revised: 1j3HA7JbVF7PZMWKbr8nWqNwr8vr6YZMfU7gpv_JkmHo
- Data Retention UI: 1iG0Pe0CVTSFCzUzs8PDaxou7WRQN0S1lhpvf6iytuGo
- Superseded Reconciliation: 1QQw9U33_cVzDXlJErLmmMnWGhpN6nttVx15YNjp6IhI
- Feature Fold Reconciliation: 1Yf-znA75VOrebd2BvpS5jnzj9r9mD127DnMCAfCNjmY
- Deferred Items Reconciliation: 14zskNhSO_3TKkPxlQPD_nC4QDSBmzzXceRIam1uSvN0
- Sync Reconciler + Changelog: 1edcpJptVPaA7VP6svP4QjDuhtq-POrJrbZJYAhxcppc ← NEW
- Savant → Journalism: 1O0G68_lS_HWYWdYYLWkWiJ-8dLWsURuE9RKMhF3_Cjo ← NEW

## Key Decisions
- Circadian = per-game state, not global mode
- Three-intent disclosure (anticipation/attention/reflection)
- shouldUnseal = one-liner from getCardCircadian
- Momentum sort KILLED → Pulse Chip (factual annotation)
- Narrative Depth DEMOTED to prompt quality gate
- Watch Engine + What to Skip PERMANENTLY KILLED
- 13 adapters identified for cross-system integration (3 shipped/fixed, 2 specced, 8 open)
- Weather API: Visual Crossing (commercial-free) recommended
- Sync Reconciler changelog = O(1) Newspaper "What's Moving" content engine
- Savant → Journalism ships standalone, folds into Context Assembler later
- Enrichment coverage (isEnrichmentRich) feeds Slate-Driven Density gravity

## Adapter Inventory (13 total)

### Shipped/Fixed
- Event Bus Consumers (Pulse Chip + CASCADE) — SHIPPED
- Decision Registry / CONTRACTS.md — SHIPPED (Rule 86)
- Codemap CI fix — FIXED (71adfa8, CODE_MAP.json generating)

### Specced (ready to build)
- Sync Reconciler + Changelog (20 min) — 1edcpJptVPaA7VP6svP4QjDuhtq-POrJrbZJYAhxcppc
- Savant → Journalism (15 min) — 1O0G68_lS_HWYWdYYLWkWiJ-8dLWsURuE9RKMhF3_Cjo

### Open (unspecced)
- Budget Coordinator (10 min) — shared KV daily key
- Context Assembler (30 min) — 15 sources → one prompt function
- Game State Transition Hook (15 min) — closing odds capture + live bracket
- Identity Resolver (30 min) — team name matching (+77 odds matches)
- Sync Reconciler pattern consumers: Savant, weather, drama, injuries
- Brief Write Integrity (10 min) — KV vs D1 reconciliation
- Game Archive Completeness (10 min) — daily check
- Post-Deploy Verification (15 min) — SHA check

### Folded
- Context Assembler (expanded) — folded into Context Assembler

## Priority List
1. O(1) Newspaper (45 min)
2. API-Sports Football Pro renewal (June 29)
3. Close the Loop — expanded (60 min)
4. P16 Drama + GLYPH (45 min)
5. Odds Story client (45 min, data ready)
6. Soccer Intelligence (65 min)
7. Slate-Driven Density (30 min)
8. Circadian System (2 hrs)
9. The Debrief + Scorecard (3 hrs)
10. Unified Cross-Layer Search (50 min)
11. NFL SPORT_TO_V2 (1 hr, Sept 9)
12. Intent-Based MCP (30 min)

## CC Prompts Ready
- CC-CMD-close-the-loop.md (jubilant-bassoon)
- CC-CMD-odds-story.md (field-relay-nba)
- CC-CMD-nba-clutch-fix.md (jubilant-bassoon)

## Self-Managing
- Odds backfill: daily 10 UTC, fully caught up
- Analytics Cron: daily 9 UTC, 12 phases
- AI Gateway: 89% cache hit, $1.56/day
- Codemap CI: generates CODE_MAP.json on every push to index.html/smoke.js/STANDARDS.md

## Deadlines
- June 25: WC MD3 starts (CASCADE + mini-card ready)
- June 29: API-Sports Football Pro renewal
- Sept 9: NFL in SPORT_TO_V2
