# CC Outbox — Live MLB Status Refresh (no full re-render)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-mlb-status-live-refresh.md
**Commits:** aab42d4 (implementation), c2c3c3b (shrink probe result)
**Deploy:** Deploy gate run 28695154089 — succeeded

---

## Probe block — run before any edit, as instructed

All four items re-checked live, **zero drift from the doc's citations**:

```
grep -n "async function loadMLBSlate" index.html    → 19982
grep -n "async function fetchMLBFixtures" index.html → 20013 (doc: ~20013)
grep -n "function syncCardAttributes" index.html     → 20988
grep -n "initNightOwlPoll" index.html                → 21778 (doc: 21778-21785)
```

Also independently confirmed the doc's own citations that weren't in the
bash probe block: `fetchMLBFixtures()`'s single call site at
index.html:21772 (doc's exact citation, matched).

## Critical check — `loadMLBSlate` re-confirmed side-effect-free, per explicit instruction

Read the full body, not just the signature. Then went one level further
than the doc's own probe asked for: traced the **entire transitive call
chain**, since a side effect introduced in a function `loadMLBSlate`
calls internally would break the "side-effect-free" assumption just as
badly as one in `loadMLBSlate` itself.

| Function | Role | Side effects found |
|---|---|---|
| `loadMLBSlate(date)` | maps `fetchMLBSchedule` results to add GOTD/stream fields | none — pure `.map()` over plain objects |
| `fetchMLBSchedule(date)` | `fetch()` + `normalizeMLBGame` map | none beyond the network call itself |
| `normalizeMLBGame(g, date)` | builds the per-game object | none — pure object literal construction, calls only other pure helpers (`parseBroadcasts`, `normalizeMLBStatus`, `normalizeMLBPeriod`, `resolveBundle`, `normalizeMLBPitcher`) |

No `document.*`, no `allData.*` writes, no `renderAll`/`scheduleRenderAll`/
`buildFilters` calls anywhere in this chain. Safe to build on.

## Implementation

- `refreshMLBStatus()` — added immediately after `loadMLBSlate` and
  before `fetchMLBFixtures()` (index.html ~20013), exactly as specified.
  Finds the MLB section in `allData.sports`, calls `loadMLBSlate()`
  directly (not `fetchMLBFixtures()`), matches games via the existing
  `home|away|hour` key already established for doubleheader-safe
  matching, and for each game whose `status` actually changed: updates
  `game.status`/`game.homeScore`/`game.awayScore` in place and calls
  Phase 1's `syncCardAttributes(card, game, null, isLive, isFinal)` —
  the same targeted-patch registry `renderESPNScores()` uses, not a new
  mechanism.
- `initMLBStatusPoll()` — IIFE, `setTimeout(refreshMLBStatus, 10000)`
  then `setInterval(refreshMLBStatus, 90000)`, mirroring
  `initNightOwlPoll`'s exact proven cadence.

## Confirmed by direct code read — no full-render trigger

Per the explicit DONE CONDITION ("not just 'it compiles'"): read
`refreshMLBStatus`'s complete body and confirmed it contains **zero**
calls to `scheduleRenderAll()`, `renderAll()`, or `buildFilters()` —
only `allData.sports.find`, the already-verified-pure `loadMLBSlate`,
`captureFieldError`, `document.querySelector`, and `syncCardAttributes`.
`fetchMLBFixtures()` was deliberately NOT called on an interval, per the
explicit instruction — confirmed this instruction was followed by
checking `refreshMLBStatus` never references `fetchMLBFixtures` at all.

## Smoke assertions

3 new: `A-MLBSTATUS-1` (`refreshMLBStatus` exists), `A-MLBSTATUS-2`
(`initMLBStatusPoll` exists), `A-MLBSTATUS-3` — the regression guard,
scanning `refreshMLBStatus`'s own function body (bounded to its
column-0 closing brace, not the whole file, since
`scheduleRenderAll`/`renderAll`/`buildFilters` legitimately exist
elsewhere — e.g. inside `fetchMLBFixtures`, which this function must
never call) for any of the three full-render triggers.

`node smoke.js index.html`: **842 passed, 0 failed** (839 baseline + 3
new).

## SW_VERSION

Bumped to **`2026-07-04a`** — a genuine day rollover happened mid-session
(real ET midnight passed: checked system time directly, 00:38 EDT
July 4), so per Rule 23 the suffix resets to `a` for the new day rather
than continuing 2026-07-03's `e` sequence. Caught by checking real system
time again rather than assuming continuity from the prior commit's
version.

## CC-verifiable confidence score (per the doc's own rubric)

- **+25** — `refreshMLBStatus`/`initMLBStatusPoll` added exactly as
  specified, full-script syntax check clean
- **+25** — Confirmed by direct code read (not assumed) that the
  function never triggers a full re-render
- **+25** — Smoke 3/3 new assertions green, 842/0 total
- **+25** — CI confirms deployed (Deploy gate run 28695154089,
  succeeded); live bundle re-verified directly to contain
  `refreshMLBStatus`, including its actual wiring into
  `syncCardAttributes` (not just the function's existence in isolation)

**Total: 100/100.** Committed.

## Live bundle re-verified directly

Fifth use of this pattern this session (via `workflow_dispatch`, since
the push-trigger file's URL was already correct):

```
16110: async function refreshMLBStatus() {
16135: syncCardAttributes(card, game, null, isLive, isFinal);
16139: (function initMLBStatusPoll(){
```

Line 16135 specifically confirms the wiring into Phase 1's registry, not
just that the function exists unused. `SW_VERSION = '2026-07-04a'`
confirms this exact commit is deployed. Full response (31,298 lines) not
kept verbatim — replaced with the extracted finding in
`outbox/cf-result-20260704T044034Z.txt`.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real observation of a live MLB game's `status` actually updating
      via this new path during an active session**, and its card's
      `data-circadian`/`espn-live`/`espn-final` classes not needing to
      wait for ESPN's slow cycle to catch up. This is the actual
      resolution of the dual-source finding this CC-CMD exists to fix —
      code existing and being logically correct is not sufficient
      evidence on its own, per the same lesson established across
      v2.1/v2.2/v2.3/Phase 1 tonight. This sandbox has no way to hold a
      live session open across a real MLB game's status transition and
      observe it; the static probe above confirms the code shipped
      correctly, not that it fires correctly over time.

---

## Done Conditions

- [x] Probe block re-run, all four functions/patterns confirmed present
      at expected shapes (zero drift)
- [x] `refreshMLBStatus`/`initMLBStatusPoll` added exactly as specified
- [x] Confirmed via code read (not just "it compiles") that
      `refreshMLBStatus` never calls `scheduleRenderAll()`,
      `renderAll()`, or `buildFilters()`
- [x] `node smoke.js index.html` exits 0, all 3 new assertions green
      (842/0 total)
- [x] CI confirms `refreshMLBStatus` exists in the deployed bundle —
      verified directly via live-URL probe, including its actual call
      site wiring into `syncCardAttributes`
- [x] SW_VERSION bumped in `index.html` and `sw.js` (`2026-07-04a`,
      real ET-day-rollover correctly detected and handled)
- [x] Outbox manifest written (this file)
