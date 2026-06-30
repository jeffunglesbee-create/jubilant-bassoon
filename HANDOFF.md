# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 5: Context Gate Fix + AVV-MLS)

**CLIENT HEAD: ae588c2a**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 810cccea** (buildSoccerXGContext gate fix)
**SMOKE: 807/0**

---

## THIS SESSION — SHIPPED

### Real gap found and fixed: buildSoccerXGContext never consumed _hasMatchStats

While verifying readiness to write the AVV-MLS CC-CMD, direct inspection
of the live context-assembler.js found that dual-source CC-CMD's Task 1
(relay commit ea84747d) widened the **relay route** `/soccer/xg` to return
`_hasMatchStats`, but never updated `buildSoccerXGContext` — the actual
**consumer** — which still gated purely on `if (!d?._hasXG) return ''`.
MLS games (where `_hasXG` is always false) were therefore STILL getting
zero soccer context despite the route-level fix. Confirmed live before
fixing: `_hasXG: false, _hasMatchStats: true`, function still returned `''`.

Fixed: gate now passes on `_hasXG OR _hasMatchStats`; added a fallback
formatting block (possession/shots/passes/cards) that fires when the
existing xG-specific lines produce nothing but match stats are present.
Commit `810cccea` — deliberately NOT `[skip ci]` this time. Auto-trigger
on push didn't fire for an unexplained reason (touched `src/**`, no
skip-ci, should have triggered per deploy.yml's path filter — worth
investigating if it recurs); caught via direct run-list check rather than
assumed, manually dispatched, confirmed deployed.

Live verification: `/journalism/context-probe` returns no MLS entry today
(season paused, confirmed separately) so full pipeline re-confirmation
waits for July 22 — but the underlying relay-route data (AVV-MLS-003's
target) and the gate-fix code path are both independently verified.

### AVV-MLS CC-CMD written

`docs/CC-CMD-2026-06-30-avv-mls.md` — jubilant-bassoon only, adds
`test.describe('MLS — Tournament + Stats')` with AVV-MLS-001 through 005,
following the established MLB/AFL pattern.

**Important honesty check baked into the doc:** MLS is paused May 24–Jul 22
(World Cup) — confirmed live, zero MLS games exist to test a DOM-rendering
check against today. Three of five tests (002, 003, 005) don't need a live
game at all — they test relay routes/D1 data directly against known
historical/future-dated targets and should produce real DEFINITIVE output
today, no skip excuse. Two tests (001, 004) genuinely need a live game for
full pipeline proof and use the same graceful-skip pattern established for
AFL on 2026-06-29 — log clearly, return without failing, self-activate
July 22. The doc is explicit that 002/003/005 skipping would signal a real
regression, not an expected gap — these two skip-categories are not
interchangeable and the doc's DONE CONDITION enforces that distinction.

Also confirmed during this work (previously assumed, now verified): the
client (index.html) has extensive MLS support already wired —
`'usa.1':'mls'` league-slug mapping plus dozens of sport-detection call
sites (broadcast verb selection, weather alerts, push-notification
scoring). AVV-MLS-001 is gated on season timing only, not on missing
client support.

---

## CC-CMDS QUEUED — NEXT SESSION

**#1a (field-relay-nba):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-relay.md. Execute all
tasks. Nothing commits without confidence ≥ 95. Do not include [skip ci]."

**#1b (jubilant-bassoon, after #1a ships and deploys):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-client.md. Confirm the
Part B dependency check before starting Part B. Execute all tasks. Nothing
commits without confidence ≥ 95."

**#2 (jubilant-bassoon, no dependency — can run anytime, including before #1a/#1b):**
"git pull. Read docs/CC-CMD-2026-06-30-avv-mls.md. Execute all tasks.
Nothing commits without confidence ≥ 95. AVV-MLS-002/003/005 must produce
real DEFINITIVE output, not skips — that distinguishes them from
AVV-MLS-001/004's expected graceful-skip during the MLS World Cup pause."

**#3 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary: "East CF" → "Eastern Conference Finals" etc.
- European club coverage in identity-resolver before August (EPL, La Liga, UCL, etc.)
- Two-legged tie game_number=2 handling — stats-api-sourced ties (TELUS,
  confirmed Jul 9–14) have no aggregate field; flagged in both round-label
  split docs' KNOWN GAPS sections.
- **NEW:** investigate why the 810cccea push didn't auto-trigger deploy.yml
  despite touching src/** with no [skip ci] — manual dispatch worked, but
  the auto-trigger gap is worth a root-cause pass if it recurs.

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order, #2 has no dependency on #1a/#1b)
1. CC-CMD-2026-06-30-round-label-relay.md (field-relay-nba)
2. CC-CMD-2026-06-30-round-label-client.md (jubilant-bassoon, after #1)
3. CC-CMD-2026-06-30-avv-mls.md (jubilant-bassoon, independent)
4. identity-resolver MLS club-ID mapping (new spec needed)

### 🔨 INFRASTRUCTURE
5. Bosnia DB fix + identity-resolver CANONICAL map
6. team_form CONTEXT_SOURCE v3
7. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
8. wentToOT hardcoded false
9. KV editorial keys not consulted
10. NFL SPORT_TO_V2 — September 9
11. Odds Daily Counter stale
12. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- MLS stats API: stats-api.mlssoccer.com (no key) — see codex mls-schedule-stats-api-2026-06-30

SESSION END: RELAY 810cccea · CLIENT ae588c2a · 2026-06-30 · buildSoccerXGContext gate fix shipped+deployed, AVV-MLS CC-CMD written · via chat
