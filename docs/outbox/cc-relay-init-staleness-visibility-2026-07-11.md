# CC Session Outbox — Relay-Init Staleness Visibility (CC-CMD-2026-07-11-relay-init-staleness-visibility)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole repo for this doc). All tasks.

## TASK 1 — Confirmed list, re-derived the real triage (not copied from priors)

Re-grepped from HEAD: all 9 functions named in the doc exist, unchanged
names — `mlbProbablePitcherInit`, `mlbPitcherStatsInit`, `mlbStatsInit`,
`nbaPlayerCluichInit`, `nhlSeriesInit`, `nbaCluichInit`, `nhlGSAXInit`,
`soccerFBrefInit`, `uflEpaInit`. Confirmed `nhlAnalyticsInit` (line
19853, pre-instrumentation numbering) is NOT a 10th instance — it's
synchronous, no fetch, no try/catch, pure local game-object enrichment.

Per-function consumer trace (the actual triage the doc asked for — not
applied as a blanket answer):

| Function | Backing data | Stub fallback shape | Reaches a user-visible surface? |
|---|---|---|---|
| `mlbProbablePitcherInit` | `_mlbPitcherIdCache` | starts `{}` — no baked-in values | `getStatOfDay()` — but empty cache ⇒ null, nothing rendered |
| `mlbPitcherStatsInit` | `_mlbPitcherStatsCache` | starts `{}` — no baked-in values | same as above |
| `mlbStatsInit` (5 sub-tables) | `TEAM_ABS_RANKINGS`, `PLAYER_EXPECTED_STATS`, `PLAYER_SPEED` (3 of 5: **zero callers anywhere** — dead code, pre-existing, out of scope), `PITCHER_TEMPO`, `PITCHER_ARSENAL` (2 of 5: feed `getMLBAnalyticsContext()` — journalism-prompt lines only, no DOM chip) | static, non-null stub values | No — either dead or prompt-text-only |
| `nbaPlayerCluichInit` | `NBA_CLUTCH_PLAYERS` overlay | static, `[VERIFY]`-tagged stub values with real numbers | Only `getNBAClutchProfile()` → `[CLUTCH] ...` journalism-prompt line (line ~19852). No DOM chip/tooltip surface exists for player-level clutch. |
| `nhlSeriesInit` | `NHL_SPECIAL_TEAMS._seriesPP/_seriesPK` | **no stub** — `isSeries: st._seriesPP != null` in `getNHLEffectiveST()` is a genuine per-team gate on live data | Yes (Analytics Edge chips) — but gated safely by construction |
| `nbaCluichInit` | `NBA_TEAM_ANALYTICS.clutchDrtg/.clutchNetRtg` | static stub for OKC (109.1) / NYK (108.8), `null` for all others | **Yes, unsafely** — chip renders identically whether live or stub; no per-team success gate |
| `nhlGSAXInit` | `NHL_GOALIE_RATINGS._gsax` | **no stub at all** — field is never set anywhere except this function | Yes (GSAX chip) — but gated safely by construction (`_gsax != null`) |
| `soccerFBrefInit` | `_soccerFBrefCache` | starts `{}`, returns `null` on failure | `getSoccerFBrefStats()` — null-safe, nothing renders on failure |
| `uflEpaInit` | live polling loop, no stub | n/a — feature is entirely absent on failure, not stale | Absence, not staleness |

**Correction to the initial pre-compaction triage:** the first pass had
flagged `nhlSeriesInit`/`nhlGSAXInit` as "high stakes" alongside
`nbaCluichInit`. Re-deriving the actual gate logic (`isSeries`,
`_gsax != null`) shows both are already safe by construction — a
relay failure produces *zero* chip, not a stale-looking one, because
there is no baked-in stub for either. Only `nbaCluichInit` (via its
two hardcoded OKC/NYK numbers) can silently render a stale value that
looks identical to a fresh one. This is the real, narrower risk.

## TASK 2 — Shared staleness primitive, all 9 instrumented

`window._relayInitStatus = {}` + `_recordRelayInit(name, ok, error)`
added once (index.html, before `mlbProbablePitcherInit`). All 9
functions call it at every real success point and every real failure
point (`!r.ok`, empty/invalid response shape where applicable, and
`catch`) — never leaving a function's status as an unrecorded third
case. No function's fetch/overlay/fallback logic changed; every
addition is a call sitting next to (never replacing) the existing
`return`/`catch` statements. Verified via `git diff` — see VERIFICATION.

## TASK 3 — Health Panel section

Added a grouped section (`🧩 Relay Init (9 overlays)`) to
`buildFieldHealthPanel()`, reusing the same inline-HTML grouped-row
pattern already used for "Score Confidence" — not a new UI pattern.
Shows loaded/failed/not-yet-run counts out of 9, plus one line per
actual failure with its real error string. A header badge shows
"N failing" when any exist, or "not yet run" only when literally none
of the 9 have executed yet.

## TASK 4 — Per-function user-facing decision (not a blanket answer)

- **`nbaCluichInit` → YES, fixed.** The only one of the 9 where a stub
  value can render indistinguishably from live data on an actual DOM
  surface (the Analytics Edge chip's NBA clutch-DRTG badge). Added a
  tooltip note (`· unverified stub, relay data unavailable`) to both
  home/away clutch-DRTG chips in `_buildAnalyticsChips()`, shown only
  when `!_nbaCluichLoaded`. Lightweight, additive — matches the doc's
  own suggested scope ("even a title/tooltip attribute").
- **`nhlSeriesInit`, `nhlGSAXInit` → No additional UI needed.** Both
  are already safe by construction: the chips that read their data
  are gated on a per-team null-check (`isSeries`, `_gsax != null`)
  that is only ever true after a real live overlay. A relay failure
  produces no chip at all, not a misleading one. Health Panel
  dev-visibility is sufficient.
- **`nbaPlayerCluichInit` → No UI surface exists to attach an
  indicator to.** Its stub (`NBA_CLUTCH_PLAYERS`) has the same
  "static number could look fresh" risk as `nbaCluichInit`, but it is
  only ever read into internal journalism-prompt text (`[CLUTCH] ...`
  line), never rendered as a raw stat with a tooltip surface. Inventing
  a new UI element for this would exceed "lightweight" and this task's
  scope. Flagged here for a future prompt-engineering pass if this is
  judged to matter (e.g. having the prompt itself note when the stat is
  unverified) — not fixed in this CC-CMD.
- **`mlbProbablePitcherInit`, `mlbPitcherStatsInit` → No UI needed.**
  Both start from an empty cache with zero baked-in stub values,
  so a failure is invisible because nothing renders — not because
  something stale renders. Safe by construction.
- **`mlbStatsInit` (5 sub-tables) → No UI needed.** 3 of 5 tables
  (`TEAM_ABS_RANKINGS`, `PLAYER_SPEED`, `PLAYER_EXPECTED_STATS`) have
  zero callers anywhere in the codebase — genuinely dead, pre-existing,
  out of this task's scope (a Rule 63 NO-DEAD-CODE finding, not
  actioned here). The other 2 (`PITCHER_TEMPO`, `PITCHER_ARSENAL`) only
  feed journalism-prompt text, same reasoning as `nbaPlayerCluichInit`.
- **`soccerFBrefInit`, `uflEpaInit` → No UI needed.** Both fail into
  "feature absent," not "stale data shown" — `soccerFBrefInit` returns
  `null` on failure (null-safe consumer), `uflEpaInit`'s overlay chip
  requires `state?.lastPlay`, which is never set if the init never runs.

## VERIFICATION

- **Real forced-failure/success test** (Node `vm`, extracted verbatim
  source — `_recordRelayInit` + `nbaCluichInit`, not reimplemented):
  1. `fetch` mocked to return `{ok:false, status:404}` → confirmed
     `window._relayInitStatus.nbaCluichInit = {ok:false, error:'HTTP 404'}`,
     `_nbaCluichLoaded` stayed `false`, `NBA_TEAM_ANALYTICS.OKC.clutchDrtg`
     stayed at its stub value (109.1) — stub correctly retained.
  2. `fetch` mocked to return a real 200 + JSON body → confirmed
     `window._relayInitStatus.nbaCluichInit = {ok:true, error:null}`,
     `_nbaCluichLoaded` became `true`, `OKC.clutchDrtg` overlaid to the
     mocked live value (103.4) — live overlay correctly applied.
  3. Restored (no lingering state — this was a throwaway `vm` context,
     not a change to any committed file).
- **Health Panel section exercised directly** (extracted verbatim,
  `eval`'d with a real `window._relayInitStatus` object): confirmed a
  1-failure/8-pending state renders `"1 failing"`, the failed function
  name, and its real error string; confirmed an all-9-success state
  renders a clean `9/9` with no failure lines.
- **`git diff index.html` reviewed line-by-line**: every non-instrumentation
  hunk is either a straight `_recordRelayInit(...)` call addition next
  to an existing `return`/`catch`, or the new Health Panel block, or
  the two clutch-DRTG tooltip lines. No fetch, no overlay assignment, no
  existing `try`/`catch`, and no existing fallback path was altered.
  One line (`mlbPitcherStatsInit`) hoists `Object.keys(...).length` into
  a `const` reused by both the debug log and `_recordRelayInit` — same
  computed value, not a logic change.
- `node smoke.js index.html`: **919 passed, 0 failed**.
- `node field_unit.js`: **66 passed, 0 failed**.
- `node field_smoke.js index.html`: 21 failures — confirmed via
  `git stash` / re-run against the pre-existing HEAD that these are
  **identical, pre-existing failures unrelated to this change** (same
  count, same failing IDs, present before this session touched
  anything). Not a regression.

## DONE CONDITION

All 9 functions report real status (success or failure) into one
shared, checkable state — verified live, not asserted. Health Panel
surfaces it, reusing the existing grouped-row pattern. TASK 4's
per-function decision is made and individually justified — 1 of 9
(`nbaCluichInit`) got an actual UI fix; the rest were found to be
either already safe by construction or lacking any UI surface to
attach an indicator to, and each reason is stated per-function above,
not defaulted.

## CONFIDENCE SCORING

- +15 — TASK 1 triage genuinely done, not treated as uniform: **met**
  (found and corrected a real gap in the initial pre-compaction guess —
  `nhlSeriesInit`/`nhlGSAXInit` are actually safe by construction, only
  `nbaCluichInit` carries the real risk)
- +25 — TASK 2 staleness primitive correctly records both success and
  failure for all 9: **met** (verified via grep — 9 unique function
  names, each with a success call and a failure call in every branch)
- +25 — TASK 3 Health Panel integration reuses existing pattern,
  genuinely visible: **met** (grouped-row style matching "Score
  Confidence"; exercised directly with both a failure and an
  all-success state)
- +20 — TASK 4 per-function user-facing decision made and justified
  individually: **met** (9 distinct, reasoned decisions; 1 fix applied,
  8 explicitly justified as not needing one, no blanket answer)
- +15 — Real failure/success test constructed and verified live, not
  asserted: **met** (forced 404 → real failure recorded + stub
  retained; forced 200 → real success recorded + overlay applied)

**Total: 100/100.**

## Commit

- `index.html`: `_relayInitStatus`/`_recordRelayInit` primitive; all 9
  functions instrumented; Health Panel section added; clutch-DRTG chip
  tooltip staleness note added to `_buildAnalyticsChips()`.
  `SW_VERSION` bumped `2026-07-11d` → `2026-07-11e`.
- `sw.js`: `SW_VERSION` synced to `2026-07-11e`.
- This manifest.
- **Flagged, not actioned** (pre-existing, out of scope): 3 of
  `mlbStatsInit`'s 5 sub-tables (`TEAM_ABS_RANKINGS`, `PLAYER_SPEED`,
  `PLAYER_EXPECTED_STATS`) have zero callers anywhere — dead code
  (Rule 63). `nbaPlayerCluichInit`'s stub risk has no UI surface to
  attach a tooltip to; a future prompt-engineering pass could note
  unverified-ness directly in the journalism prompt text if judged
  worth doing.

## POST-DEPLOY LIVE VERIFICATION — 2026-07-11 19:15 UTC

Deploy-gate run 29164799416 (commit `3296970`) completed
`status:completed conclusion:success` in 33s (19:10:50→19:11:23 UTC).
Wrangler deploy log confirms `https://jubilant-bassoon.jeffunglesbee.workers.dev`
deployed for `32969707693f43869a549ff2e0343b83e0399337` (this commit's
full SHA), Current Version ID `e710d9ce-f2b1-41f5-b1b6-50bd33a2543e`.

Fetched the live site with a real headless browser (not asserted):

- `window.SW_VERSION === "2026-07-11e"` — confirmed, matches this commit.
- `typeof _recordRelayInit === 'function'` and
  `typeof buildFieldHealthPanel === 'function'` — confirmed present.
- `buildFieldHealthPanel()`'s live output contains
  `"Relay Init (9 overlays)"` — confirmed, the new Health Panel section
  actually renders in production, not just in source.
- `window._relayInitStatus` already had **7 of 9 real entries**
  recorded from the page's own real boot sequence (not seeded by this
  verification) — `soccerFBrefInit`/`uflEpaInit` correctly absent since
  neither is called on today's slate (both are lazy/conditional by
  design).

**New, real, previously-invisible finding surfaced immediately by this
feature — reported per Rule 77, not fixed here (out of this CC-CMD's
scope, and touches live relay endpoints that need their own
diagnosis):**

| Function | Live status | Real error |
|---|---|---|
| `nbaPlayerCluichInit` | `ok:false` | **`NBA_STATS_RELAY is not defined`** |
| `nhlSeriesInit` | `ok:false` | `HTTP 403` |
| `nhlGSAXInit` | `ok:false` | `HTTP 403` |
| `mlbStatsInit`, `mlbProbablePitcherInit`, `mlbPitcherStatsInit`, `nbaCluichInit` | `ok:true` | — |

`nbaPlayerCluichInit`'s failure is not a network/relay problem — it's a
`ReferenceError`. Confirmed via grep: `NBA_STATS_RELAY` is referenced
once (index.html:8417) and declared nowhere in the file. This function
has been silently no-op-ing in production (empty effective behavior,
masked by its own try/catch) for as long as that line has existed —
this task's instrumentation is what surfaced it, on the very first live
page load after deploy. `nhlSeriesInit`/`nhlGSAXInit` both getting a
real `HTTP 403` from `field-relay-nba.jeffunglesbee.workers.dev`
(rather than a timeout or 5xx) suggests an auth/allowlist issue on the
relay side — that repo is outside this session's tool scope to
investigate further.

**Recommend a follow-up CC-CMD**: (1) fix the `NBA_STATS_RELAY`
undefined-variable bug (likely a missing/renamed constant — probably
should read from the same relay base used elsewhere, e.g.
`_NHL_SERIES_RELAY`'s host), (2) diagnose the two relay-side 403s in
field-relay-nba. Not attempted here — correctly out of scope for a
visibility-only task, and exactly the kind of thing this feature exists
to make impossible to miss going forward.

