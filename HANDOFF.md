# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 4: CC-CMD Doc Split)

**CLIENT HEAD: 64b73c91**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 4daaf058** (unchanged — this part was docs only)
**SMOKE: 807/0**

---

## THIS SESSION — SHIPPED

### CC-CMD doc split: round-label-aggregate → relay-only + client-only

The combined `docs/CC-CMD-2026-06-30-round-label-aggregate.md` required one
CC session to operate across both repos in sequence. This is exactly the
failure mode hit earlier this session (CC opened against field-relay-nba,
couldn't find a spec doc that lives in jubilant-bassoon per the two-repo
separation rule, correctly asked rather than fabricated). Split into two
self-contained, single-repo CC-CMDs to remove the cross-repo juggling
entirely:

- `docs/CC-CMD-2026-06-30-round-label-relay.md` (field-relay-nba only) —
  Tasks 1 (round label fix), 2a (series extraction in /soccer/xg), 2b
  (conditional second-leg enrichment). Re-verified against the CURRENT
  post-dual-source code before splitting — Task 2a's target
  (`/soccer/xg`'s summary-fetch block) is untouched by the dual-source
  edits (those touched the separate statistics-fetch block further down
  the same route); Tasks 1 and 2b's targets are upstream of all dual-source
  insertions, completely unshifted. Includes an explicit DEPLOY section
  warning against `[skip ci]` on runtime-code commits, referencing the
  exact mistake made and caught during the dual-source session.

- `docs/CC-CMD-2026-06-30-round-label-client.md` (jubilant-bassoon only) —
  Task 3 (client badge), restructured into two explicit parts: Part A
  (NBA/NHL/UFL/MLS-tournament round badge — no dependency, ready now,
  postseason_games.round already has real data) and Part B (soccer
  "1st/2nd Leg" label + aggregate score — depends on the relay doc shipping
  and deploying first; includes a live curl check to confirm before
  starting Part B, with explicit instruction to stop and document as
  blocked rather than fabricate the relay payload shape if unmet).

Original combined doc marked SUPERSEDED (banner added, content preserved
for historical reference, not deleted) — commit `64b73c91`.

---

## CC-CMDS QUEUED — NEXT SESSION

**#1a (field-relay-nba, run first):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-relay.md. Execute all
tasks. Nothing commits without confidence ≥ 95. Do not include [skip ci] —
this changes runtime code; confirm deploy.yml actually ran before claiming
done."

**#1b (jubilant-bassoon, run after #1a ships and deploys):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-client.md. Confirm the
Part B dependency check (live curl against /v2/games) before starting Part
B — if unmet, do Part A only and document Part B as blocked. Execute all
tasks. Nothing commits without confidence ≥ 95."

**#2 (after #1a and #1b — final close-out):**
Write AVV describe block for MLS: tests/adapter-visible-value.spec.js,
AVV-MLS-001 through AVV-MLS-005.

**#3 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext. Needs its own spec — touches gameMeta
construction in the live cron path, treat with same care as the dual-source
session's Probe 3.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary: "East CF" → "Eastern Conference Finals" etc.
- European club coverage in identity-resolver before August (EPL, La Liga, UCL, etc.)
- Two-legged tie game_number=2 handling — CONFIRMED PRESENT (TELUS Jul 9–14),
  not speculative. The relay-only round-label CC-CMD addresses the ESPN-
  sourced path only (aggregateScore is ESPN-native). Stats-api-sourced
  two-legged ties (TELUS, confirmed; any future MLS-club tournament with
  real legs) have NO aggregate field at all — separate handling needed,
  flagged explicitly in both new split docs' KNOWN GAPS sections so it
  isn't rediscovered by surprise.

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order)
1. CC-CMD-2026-06-30-round-label-relay.md (field-relay-nba)
2. CC-CMD-2026-06-30-round-label-client.md (jubilant-bassoon, after #1)
3. AVV-MLS describe block (jubilant-bassoon)
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

SESSION END: RELAY 4daaf058 · CLIENT 64b73c91 · 2026-06-30 · Round-label CC-CMD split into relay-only + client-only, original marked superseded · via chat
