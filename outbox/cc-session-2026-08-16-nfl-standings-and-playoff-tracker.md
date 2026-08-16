# CC Session — 2026-08-16 — NFL standings dropdown fix + data-gated playoff tracker

## Scope
(1) Verify the NFL ▼ Standings dropdown works. (2) Build a data-gated NFL playoff
seeding tracker. Both driven by probe-first discipline; both adversarially reviewed
before any code was written.

## HEAD progression
Start `03dd725` (smoke 977/0, SW 2026-08-15f) → end `f3e0115` (smoke 980/0, SW 2026-08-15h).
Deploy-gate verified published: probe manifest records `swVersion: "2026-08-15h"`.

## THE HEADLINE FINDING — the standings dropdown was BROKEN for NFL
A prior claim in this session ("standings already exist for NFL ✅") was WRONG. It was
made by reading `ESPN_STANDINGS_MAP` and seeing a `'Football (NFL)'` key — i.e. reading
the map, not the runtime path. Rule 48 Class-A violation (verify deployed behavior, not
code). The Playwright probe caught it:

```
outbox/nfl-standings-manifest-2026-08-15T23-48-36-793Z.json   (PRE-FIX)
  standingsBtnSports: ["Baseball (MLB)", "MLS Soccer"]   <- 30 buttons, ZERO for NFL
  cardSports:         [..., "NFL", ...]                  <- NFL games present
  nflStandingsBtnFound: false
```

ROOT CAUSE: the button gate (field.js ~8031) reads `sec.sport`.
`injectV2SportSection('nfl','NFL')` pushes `sport:'NFL'`, but the map was keyed only
`'Football (NFL)'` → lookup missed → NFL cards rendered no standings button at all.

## Commits (single-concern, all on main)

1. `bb0460d` — fix: only claim '(leads)' for a group's top entry (journalism context).
   PREREQUISITE, not scope creep: `fmt()` returned `(leads)` for ANY team with
   gamesBehind 0 or NaN. NFL conference GB takes values {0, 0.5, 1} across 16 AFC teams
   (verified 2026-08-16), so several teams sit at 0. Once the standings fix warmed
   `espnStandingsCache['football/nfl']`, journalism prompts would have read
   "Bills: 1-0 (leads) · Steelers: 1-0 (leads)". Rule 1. Now only the first row per
   group (division||group key) may claim the position.

2. `3fb4b31` — fix: add `'NFL'` alias to ESPN_STANDINGS_MAP (SW 2026-08-15g).
   Same `football/nfl` cache key, no `isSoccer` flag (that property picks the
   Table-vs-Standings label). Legacy `'Football (NFL)'` key retained.
   Static artifact: built index.html asserts `NFL -> football/nfl`,
   `isSoccer === undefined`, gate label `Standings`.

3. `6b0264f` — fix: group the ESPN standings panel by conference on multi-group payloads.
   `fetchESPNStandings` concatenates all child groups into one flat array, so NFL arrives
   as AFC(16)+NFC(16)=32 rows. The generic branch did `entries.slice(0,12)` renumbered
   `${i+1}` — so an NFC card opened a table containing NEITHER of its teams, with fake
   positions. Now each group renders under its own header (MLS colspan idiom).
   Single-group payloads keep the old path, so single-group leagues are untouched.
   VERIFIED OFFLINE against the committed real payload
   (outbox/espn-nfl-standings-contract-2026-08-16T00-00-21-846Z.json, 2025 final):
   32 entries / 2 groups → 35 `<tr>` (1 thead + 2 headers + 32 teams); both conference
   headers present; NFC teams Rams/Eagles/Bears/Panthers now render (they did not before).
   Also corrects the same latent truncation for MLB and NBA/NHL Playoffs (shared path).

4. `befc143` — fix: the verification probe would have FALSE-NEGATIVED a working fix.
   Two independent defects, both caught by adversarial review, neither by the audits:
     (a) selected the button via `onclick.includes('Football (NFL)')`; post-fix the
         onclick is `toggleStandings(this,'NFL','2025')` → never matches → identical
         failure output whether the fix worked or not.
     (b) `rowCount >= 16` was unreachable: panel renders 13 rows single-group, 35 grouped.
   Now selects on `toggleStandings(this,'NFL'`, threshold 30, and captures `buttonLabel`.

5. `288f2f7` — feat: data-gated NFL playoff seeding tracker (SW 2026-08-15h).

6. `606155c` — fix: probe records `swVersion` (see VERIFICATION INTEGRITY below).

7. `f3e0115` — probe: capture console/page errors + ESPN network status (open issue).

## Playoff tracker — the gate is the whole design

`nflPlayoffSeedsInit()` → `${ESPN_STANDINGS_BASE}/football/nfl/standings?seasontype=2`,
into the synchronous `NFL_PLAYOFF_SEEDS` store; `renderStatsSection` consumes it and
pushes NOTHING when ungated (no empty NFL block, no orphan header).

WHY seasontype=2 AND NOT the default endpoint — verified across every payload state in
outbox/espn-nfl-standings-contract-*.json and espn-nfl-clincher-enum-*.log:

| payload                    | gp   | result  |
|----------------------------|------|---------|
| `?seasontype=2` TODAY      | 0    | SILENT  |
| default endpoint TODAY     | 30   | RENDERS |  <- would publish PRESEASON seeds as real
| 2025 regular season        | 544  | RENDERS |  (2 confs, seeds 1-7 correct)

The default endpoint hands back playoffSeed values derived from EXHIBITION games
(LAC seed 1 off a 1-0 preseason record), so every data-presence gate fails OPEN.
`?seasontype=2` is the only query that discriminates. Pinned by smoke A-NFLSEED-2.

CLINCH: read from the `clincher` stat's `displayValue`/`description`, NEVER `.value` —
value is 0 for all 96 markers observed across 2024+2025 finals, so a truthiness test on
it renders nothing forever, silently. Pinned by smoke A-NFLSEED-3.
There is NO `note` field on these entries (null in all seven payloads probed).
Domain: `z`=Clinched Division, `y`=Clinched Wild Card, `*`=Clinched Division and Bye,
`e`=Eliminated.

LABELS: seeds 1-4 say "division leader", never "division winner". Leading a division is
what standings show; WINNING it is a clinch, and only ESPN's marker may assert it (Rule 1).

Rendered output verified against real 2025 regular-season data: seeds 1-7 both
conferences, ties handled (GB 9-7-1), bye/host/wild-card seats, "in the hunt" for 8-10.

UNVERIFIED (Rule 73): no probed payload was both regular-season-scoped AND far enough
along for anyone to have clinched, so whether `?seasontype=2` carries `clincher` is not
proven. Failure mode is benign: an absent marker renders the seat label alone, never a
wrong claim. Re-probe once a team clinches (~week 13+) before asserting clinch works.

## VERIFICATION INTEGRITY — two artifact defects fixed this session
- The probe could not distinguish "fix not deployed" from "fix does not work" (both
  render `standingsWorks:false`). It now records `swVersion`.
- ROOT CAUSE of a confusing red herring: deploy-gate NEVER RAN for `3fb4b31`/`6b0264f`.
  They were pushed together with `befc143`, which carried `[skip ci]`. GitHub evaluates
  the skip directive on the HEAD COMMIT OF THE PUSH, so one `[skip ci]` suppressed the
  deploy for two real fixes in the same push. They reached production only via the next
  non-skipped commit. LESSON: never let a `[skip ci]` commit be the head of a push that
  also contains deploy-triggering changes.

## Integration status
- BUTTON FIX: **VERIFIED**. Artifact `outbox/nfl-standings-manifest-2026-08-16T00-30-11-714Z.json`
  — `swVersion: 2026-08-15h`, `standingsBtnSports` now includes `"NFL"`, button count
  30 → 37, `nflStandingsBtnFound: true`, `buttonLabel: "▼ Standings"` (not "Table").
- PANEL OPEN: **OPEN DEFECT, NOT VERIFIED**. Same manifest: `panelPresent:false`,
  `rowCount:0`, and the label stayed `▼` — meaning `toggleStandings` fell through to its
  silent-restore path (fetch returned null/threw). This is a DIFFERENT defect from the
  key mismatch. Diagnostics added in `f3e0115` (console errors, pageerror, ESPN response
  status, `closest('.game-card')` resolution). DO NOT claim the dropdown fully works
  until a manifest shows `standingsWorks:true`.
- TRACKER: gate + mapper + render VERIFIED offline against real payloads; live render is
  correctly SILENT today (preseason), so there is nothing to see until the season starts.

## Carry-forwards (each needs its own CC-CMD before being worked)
1. NFL standings PANEL does not open after the click — root cause unknown pending the
   f3e0115 diagnostic manifest. Highest priority; the button now exists but does nothing.
2. `buildGameStandingsContext` for NFL: with the map alias in place, NFL games can now
   feed a standings line into J3/J5 prompts once the cache warms. The `(leads)` hazard is
   fixed, but the NFL line has never been reviewed for prompt quality.
3. Clinch verification in-season (see UNVERIFIED above).

## CC-CMD backlog audit (side task)
Swept 361 client CC-CMDs + relay; 27 candidates → 12 adversarially verified → 7 genuinely
unexecuted: 07-19-fix-mls-live-endpoint (small; a guaranteed-failing request fires on
EVERY cold start, error swallowed behind FIELD_DEBUG — but its spec's "zero callers"
premise is FALSE, `setTimeout(fetchMLSLive, 800)` is on the boot path, and it conflicts
with an earlier probe doc, so it needs a re-probe not a patch), 07-16-amnesty-leaderboard-client
(medium; has an internal contradiction re: per-game vs global render target),
07-16-amnesty-bottom-sheet (medium), 07-16-amnesty-card-face (large),
07-16-amnesty-arc-poster (large, cross-repo), 07-12-standards-index +
07-12-standards-index-wiring (medium).
