# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 2: Tournament Multiplexer + CC-CMDs Queued)

**CLIENT HEAD: 33d36834**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: e7f8bd56** (identity-resolver: all 30 MLS clubs)
**SMOKE: 807/0** (A-TOURN-1–4 verified in main smoke.js lines 5698-5718)

---

## THIS SESSION — SHIPPED

### 1. Identity resolver: all 30 MLS clubs (relay commit e7f8bd56)
Was 10 of 30. All 30 clubs now canonicalized against stats-api names, including ESPN display-name variants and old api-sports seed variants.

### 2. Tournament multiplexer: 60 rows in postseason_games
Files on main (jubilant-bassoon):
- `scripts/seed-mls-tournaments-2026.py` — entity-filtered, generic competition iteration, no hardcoded allowlist. Excludes MLS Test (patched after first run revealed garbled "Total" section_name). commit 33d36834.
- `.github/workflows/mls-tournaments-seed.yml` — daily 11am UTC cron + workflow_dispatch
- `outbox/cc-tournament-multiplexer-2026-06-30.md` — CC outbox

D1 postseason_games MLS state (confirmed, idempotency verified):
- Leagues Cup Phase One: 54 games (Aug 4–14)
- TELUS Canadian Championship Quarterfinals: 4 games (Jul 9–14)
- US Open Cup Semifinals: 2 games (Sep 16–17)
- Total: 60 rows, 0 TBC rows, idempotent ✅

**STAGED:** End-to-end smoke of A-TOURN-3 and A-TOURN-4 against committed files still needs a CI run to confirm. The workflow registers on main now; smoke can be triggered via workflow_dispatch on mls-tournaments-seed.yml to confirm D1 writes live, or wait for 11am UTC cron.

### 3. CC-CMD amendment: round-label-aggregate extended to all sports
`docs/CC-CMD-2026-06-30-round-label-aggregate.md` amended (77e2592b) — removed soccer-only restriction. NBA/NHL/UFL `round` data verified correct in postseason_games. One badge component, all sports.

### 4. Standing approval rule saved to memory
Consistency and correctness follow-ups always approved: data normalization, canonicalization, identity-mapping gaps, vocabulary standardization, missing coverage in registries/resolvers, schema consistency fixes.

---

## CC-CMDS QUEUED — NEXT SESSION

Run in this order. All docs in jubilant-bassoon.

**#1 (unblocked):**
"git pull. Read docs/CC-CMD-2026-06-30-soccer-stats-dual-source.md. Execute all tasks. Nothing commits without confidence ≥ 95. If probe 3 stop condition triggers, halt and write findings to outbox only."

**#2 (run after #1 completes):**
"git pull both repos. Read docs/CC-CMD-2026-06-30-round-label-aggregate.md. Execute all tasks across both repos in order: field-relay-nba first (Tasks 1–2), jubilant-bassoon second (Task 3). Nothing commits without confidence ≥ 95."

**#3 (after #1 and #2 — final close-out):**
Write AVV describe block for MLS: tests/adapter-visible-value.spec.js, AVV-MLS-001 through AVV-MLS-005 (see session notes for spec).

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary: "East CF" → "Eastern Conference Finals" etc. One SQL UPDATE + write-path patch.
- espn_event_id null on all MLS rows (cross-reference gap — separate identity-resolver session)
- European club coverage in identity-resolver before August (EPL, La Liga, UCL, etc.)
- Two-legged tie game_number=2 handling — confirmed absent from TELUS Canadian Championship data (two legs stored as separate series_keys via different match_ids); spec needed before August UCL qualifying

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order)
1. CC-CMD-2026-06-30-soccer-stats-dual-source.md (field-relay-nba)
2. CC-CMD-2026-06-30-round-label-aggregate.md (field-relay-nba + jubilant-bassoon)
3. AVV-MLS describe block (jubilant-bassoon)

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

SESSION END: RELAY e7f8bd56 · CLIENT 33d36834 · 2026-06-30 · Tournament multiplexer shipped, 60 D1 rows, dual-source + round-label CC-CMDs queued · via chat
