# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 3: Verification + Dual-Source)

**CLIENT HEAD: 4d7839bb**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 4daaf058** (soccer stats dual-source)
**SMOKE: 807/0**

---

## THIS SESSION — SHIPPED

### 1. Tournament multiplexer — verified FULLY complete (was STAGED)
CC's session screenshots showed a blocked, STAGED state (sandboxed against
*.workers.dev, workflow stuck on a feature branch). Real history showed CC
continued past that: pushed files directly to main, found and fixed a real
bug (MLS Test leaking in as a fake tournament), wrote a final HANDOFF
claiming "60 rows, idempotent." None of that was trusted at face value —
independently verified:
- D1 query confirmed exact breakdown: Leagues Cup 54, TELUS QF 4, US Open
  Cup SF 2 = 60. 0 TBC, 0 duplicates, 0 MLS Test.
- Triggered `workflow_dispatch` on mls-tournaments-seed.yml directly — CI
  path (not just CC's manual run) confirmed idempotent, same 60 rows.
- Found real two-legged tie in actual seeded data (TELUS Canadian
  Championship, Jul 9–14) that the original CC-CMD's narrower probe
  (US Open Cup only) didn't surface — elevates round-label-aggregate
  CC-CMD priority.
- Deleted stale branch `claude/elegant-shannon-t2dvt0` (741 commits behind,
  fully superseded — confirmed via diff before deleting).

### 2. Soccer stats dual-source — shipped (field-relay-nba)
CC-CMD-2026-06-30-soccer-stats-dual-source.md executed directly in chat
(originally dispatched to a CC session against the wrong repo for the spec
file — CC correctly refused to fabricate and asked; re-routed to direct
execution since this is relay-only JS, same class as earlier fixes this
session).

**Probe 3 (critical dependency check) — STOP CONDITION did not trigger.**
Traced all 4 `assembleContext(` call sites; confirmed `handleJournalismCycle`
(the real live cron) has MLS in its LEAGUES array and `gameMeta` always
carries `eventId`+`espnLeague` for every soccer league, no gap. (The
`espn_event_id IS NULL` D1 column finding from earlier is a *different*,
unrelated pipeline — backfill/season-form, not the live cron.)

Commits: `ea84747d` (index.js — widened `/soccer/xg` to return match stats
when xG absent; new `/statistics/` allowlist entry; new
`/soccer/season-form` route) + `4daaf058` (context-assembler.js —
`buildSoccerSeasonFormContext` + CONTEXT_SOURCES entry).

**Process error caught and fixed:** both commits included `[skip ci]`
(copied reflexively from earlier doc-only commits) which suppressed the
automatic deploy for actual runtime code. Caught via direct probe before
claiming success — manually dispatched `deploy.yml`, all 8 structural
gates passed.

**Live verification (post-deploy):**
- `/soccer/xg?league=usa.1&event=761644` → `_hasMatchStats: true`, real
  possession/shots/passes/cards for both teams. MLS games that previously
  got zero soccer context (hard-gated on absent xG) now get real context.
- `/soccer/season-form?team_id=MLS-CLU-000008` → Inter Miami: 15MP, xG
  34.484, xG_efficiency 4.516, clean_sheets 3, possession 56.29%.
- `/mls/stats/statistics/...` → 200 (was 403).

**Known gap, documented not solved:** `buildSoccerSeasonFormContext`
returns `''` for every game today — `game.mlsHomeTeamId`/`mlsAwayTeamId`
don't exist anywhere yet. Needs identity-resolver extended with a
name → `MLS-CLU-xxxxxx` mapping, wired into `gameMeta` construction
(index.js:5571, same call site Probe 3 confirmed clean). Separate CC-CMD.

Outbox: `outbox/cc-soccer-dual-source-2026-06-30.md` (field-relay-nba).

---

## CC-CMDS QUEUED — NEXT SESSION

**#1 (next, now higher priority — real two-legged tie confirmed in live data):**
"git pull both repos. Read docs/CC-CMD-2026-06-30-round-label-aggregate.md.
Execute all tasks across both repos in order: field-relay-nba first
(Tasks 1–2), jubilant-bassoon second (Task 3). Nothing commits without
confidence ≥ 95."

**#2 (after #1 — final close-out):**
Write AVV describe block for MLS: tests/adapter-visible-value.spec.js,
AVV-MLS-001 through AVV-MLS-005.

**#3 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext. Needs its own spec — touches gameMeta
construction in the live cron path, treat with same care as Probe 3.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary: "East CF" → "Eastern Conference Finals" etc.
- European club coverage in identity-resolver before August (EPL, La Liga, UCL, etc.)
- Two-legged tie game_number=2 handling — CONFIRMED PRESENT (TELUS Jul 9–14),
  not speculative. round-label-aggregate CC-CMD #1 above addresses display;
  the underlying leg-pairing/aggregate-score data model is ESPN-native
  (aggregateScore field) for ESPN-sourced soccer, but TELUS Canadian
  Championship is stats-api-sourced (via tournament multiplexer) — that
  source has NO aggregate field, legs are just two independent rows linked
  only by team-pair + date proximity. round-label-aggregate CC-CMD only
  covers the ESPN path; stats-api-sourced two-legged ties (TELUS, and any
  future MLS-club tournament with real legs) need separate handling — flag
  this gap explicitly when running CC-CMD #1.

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order)
1. CC-CMD-2026-06-30-round-label-aggregate.md (field-relay-nba + jubilant-bassoon)
2. AVV-MLS describe block (jubilant-bassoon)
3. identity-resolver MLS club-ID mapping (new spec needed)

### 🔨 INFRASTRUCTURE
4. Bosnia DB fix + identity-resolver CANONICAL map
5. team_form CONTEXT_SOURCE v3
6. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
7. wentToOT hardcoded false
8. KV editorial keys not consulted
9. NFL SPORT_TO_V2 — September 9
10. Odds Daily Counter stale
11. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- MLS stats API: stats-api.mlssoccer.com (no key) — see codex mls-schedule-stats-api-2026-06-30

SESSION END: RELAY 4daaf058 · CLIENT 4d7839bb · 2026-06-30 · Tournament multiplexer verified complete, soccer dual-source shipped + deployed · via chat
