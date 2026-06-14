# FIELD HANDOFF

## Current State
- **Client HEAD:** main @ 7fe82e6 (Viewport v4 build complete; SW_VERSION bumped below)
- **Relay HEAD:** 0aa14d9 (field-relay-nba)
- **Smoke:** 635/0
- **Units:** 66/0
- **SW_VERSION:** 2026-06-14g
- **Last session:** June 14 2026

## Viewport v4 Build (June 14 2026 — main)
Executed `docs/VIEWPORT-BUILD-PLAN.md` (12 tasks, one commit each, smoke
after every change).

- **Phase 1 (BROKEN fixes):** V1 typography migration (Chakra Petch +
  DM Sans), V2 explicit P1/P2/P3 breakpoints + T1/T2 orientation gates.
- **Phase 2 (PARTIAL fixes):** V3 bottom-sheet phone-only gate, V4
  card-tier classes on `.game-card`, V5 journalism brief MID tier
  (2-line), V6 `--sport-*` tokens + SPORT_COLORS refactor, V7 44px
  touch-target floor, V8 CompactGrid 3-col at 1440.
- **Phase 3 (Token foundation):** V9 `--caution` token (was undefined
  on live), V10 COLOUR-SYS-A scaffold (drama / access / angle /
  card-highlight), V11 motion + opacity tokens, V12 typography role
  tokens.

11 new smoke assertions added (A582-A592). Smoke went from 624/0 →
635/0. A406 / A418 / A514 updated to track refactored patterns.

## ADR-002 Refactor (June 14 2026 — branch claude/elegant-shannon-t2dvt0)
Added `fieldGameTier(gameId)` (and `fieldTierRank`, `fieldTierLabel`,
`leagueImportanceTier`, `leagueImportanceRank`) as the single source of truth
for game tier classification. Migrated all 13 audit findings from
`outbox/adr-002-audit-v2.md`:

- **CRITICAL × 3** — Double Feature, Halftime Switch, RightNow badge: raw
  drama number removed from DOM; tier label used instead.
- **HIGH × 7** — computeWatchValue verdict, selectRightNowGames sort, marquee
  sibling, renderWatchWindow, STATE 4 TOP PICK, mobile live bar, buildCompoundPrompt:
  hardcoded composite thresholds replaced with named-tier checks.
- **MODERATE × 2** — ViewingConditions, _otwFindLiveGame: badge/selection now
  driven by named tier (Drama Dial mitigation no longer relied on).
- **LOW × 1** — computeLiveInterval polling cadence: aggregate fieldTierRank
  across section games drives cadence.

Smoke A514 updated to track `leagueImportanceTier` instead of `_importanceScore`.

## Claude Code Setup (NEW)
- CLAUDE.md added to repo root — Claude Code reads this automatically
- Cloud environment configured: setup script `npm install && bash scripts/setup.sh`
- Pre-commit hook activates on every Claude Code session (smoke + units + lint gate)
- Codespaces devcontainer also available (Node 20 + wrangler 3.109.0)
- Verified working from iPad via claude.ai/code (624/0 smoke confirmed)

## Today's Shipped Features

### Post-Game Brief Pipelines (NBA + NHL)
- Relay: NBA (`2b9f62e`), NHL (`053d44e`)
- Client: NBA (`33cdae2`), NHL (`5c75fdc`)
- Three sports (WC + NBA + NHL) share one queue consumer and KV namespace

### Live In-Play Odds (Complete — all 8 spec steps)
- Relay (`0aa14d9`): AmbientDO _fetchLiveOdds, teamNameMatch, priority tiers, peak/urgency, wp_update SSE, /live-wp/test
- Client (`bab2a1e`): wp_update SSE handler, espnScores writeback
- Client (`ebf5bba`): WP bar on live cards + attention bar (fixed-bottom, urgency chips)

### Temporal Polyfill
- Client (`3ddb632`): fieldNowET() + fieldDatesToQuery() — DST-correct, eliminates hardcoded -4h offset

### Infrastructure
- Client (`e8caf38`): Codespaces devcontainer
- Client (`9d0d5d4`): CLAUDE.md for Claude Code

## Priority Queue
- [ ] Dixon-Coles BLEND mode for soccer WP (~45 min, gated on visual verification)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Viewport artifact v4 (~150 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)

## Spec Documents
- Vision: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ
- Live odds spec: 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
