# CC Session Outbox — Make render-surface failures visible (CC-CMD-2026-07-11-render-surface-visibility)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). All tasks executed.

## TASK 1 — Confirmed, no drift

Re-read `_fieldRefreshDynamicSurfaces()` fresh from HEAD (line 10870,
1 line off the doc's "~10869" estimate — a comment-block shift, not
real drift). Exactly matched the described shape: 6 independent
try/catch blocks, each `catch(_) {}`, wrapping `renderESPNScores`,
`renderScoreTicker`, `renderWatchWindow`, `renderOneToWatch`,
`renderRightNow`, `updateConflictChip`. `captureFieldError` confirmed
present at line 4948, exactly as described (writes to
`window._fieldErrors`, `silent` param controls console.warn in
FIELD_DEBUG mode).

## TASK 2 — Genuine audit, not assumed isolated. Found 2 more real clusters, explicitly excluded 9 single-instance sites and 1 large out-of-scope function.

Grepped the whole file for the `typeof X === 'function'` + immediate
call + bare `catch` shape (the exact `_fieldRefreshDynamicSurfaces`
signature), then broadened to catch renderer/updater calls without the
`typeof` guard. Every hit was read in context and individually
classified — not pattern-matched and assumed.

**Found — 2 additional genuine clusters (multiple independently-wrapped
renderers/loaders running as a batch, same "split-brain" risk):**

1. **`renderAll()` tail** (lines 11720, 11723) — `updateConflictChip()`
   and `applyFieldPickBadge()`, two independently bare-catch-wrapped
   calls back-to-back at the end of the main structural render
   function. Same shape as the primary cluster, just 2 siblings
   instead of 6.
2. **Journalism companion block** (lines 14174-14183, inside
   `renderJournalism()`) — an outer bare catch wrapping
   `renderJournalismCompanion()` plus 3 inner independently
   bare-catch-wrapped "fire-and-forget" loaders (`loadArchiveTimeline`,
   `loadUpsets`, `loadMarketConsensus`). If any silently throws, the
   corresponding companion content (archive timeline / upsets /
   market consensus) simply never appears, with zero trace — the same
   failure shape, applied to secondary journalism-panel content
   instead of the primary schedule.

**Explicitly excluded — 9 single, isolated call sites (not clusters;
each individually checked, not blanket-excluded):**
- `loadBriefQualityRow` (line 5264) — lone `setTimeout`-deferred call.
- `applyNewspaperVoice` (line 11526) — lone call, already
  double-guarded by an outer `typeof` check.
- `applyFieldPickBadge` (line 22940) — a *different*, one-time
  "apply now" call site inside a separate function (not the
  `renderAll()` tail's recurring call) — a single instance, not a
  sibling batch.
- `loadBroadcastArchaeology` (line 24285) — lone call.
- `_bsdOnSSEFrame` (line 29009) — a single branch inside the SSE
  message dispatcher, not a batch of siblings.
- `renderAmbientPanel` (line 29614) — lone call inside a
  `_ricOrTimeout` wrapper.
- `renderCascadeNarrative` (line 33317) — lone call.
- `renderESPNScores` (line 33613) — a single post-fetch repaint call
  after a WC win-probability fetch resolves; already covered by an
  outer `.catch(() => {})` on the same promise chain.
- `renderJournalism` (line 14212) — a single, user-action-triggered
  call inside `openJournalismForGame()` (fired on a cross-link click),
  not part of a scheduled-refresh batch.

**Explicitly excluded — different category, out of this task's scope,
flagged for a possible future CC-CMD:** the SSE message dispatcher
`_onMessage()` (~lines 29000-29250+) contains roughly a dozen bare
`catch` blocks, including 4 more `renderESPNScores()` calls (lines
29049, 29101, 29162, 29227). These are **not** the same architectural
pattern — each guards a *different event-type branch* (score,
lead_change, final, all_final, wp_update) of one message router, not a
batch of sibling renderers running together on the same tick. A
failure in one event-type's handling doesn't create the specific
"other surfaces look fine, this one silently didn't update"
impression the doc is about — the next SSE message of that type will
generally re-trigger the same repaint. Given the doc's explicit scope
("Make render-surface failures visible in
`_fieldRefreshDynamicSurfaces`... check whether this same pattern...
appears in other clusters"), and that this SSE dispatcher is a
materially different, much larger surface (a dozen+ catches across
many concerns — data writeback, event emission, standings overlay,
not just render calls), instrumenting it here would be scope creep
beyond what this CC-CMD asked for. Not touched. Reported, not silently
dropped.

## TASK 3 — All 12 catch sites across the 3 in-scope clusters instrumented, `captureFieldError` reused exactly, no new mechanism, no renderer logic changed

Reused `captureFieldError(fn, err, silent)` exactly as it already
exists — no parallel "markSurfaceDegraded" or other new mechanism
invented.

**`silent` decision, reasoned per-function against the doc's own
named precedent (`initFIELDBrief` → `silent=false`; relay fetches →
`silent=true`):**

- **All 8 primary render/update-surface calls → `silent=false`**
  (`espn-scores`, `score-ticker`, `watch-window`, `one-to-watch`,
  `right-now`, `conflict-chip` ×2 call sites, `field-pick-badge`,
  `journalism-companion`). Reasoning: these are primary UI surfaces
  with no redundant fallback — a failure here means the corresponding
  section of the page silently doesn't update, exactly the
  `initFIELDBrief`/`renderNightOwlRecap` category (every
  `renderNightOwlRecap` call site in the codebase already uses
  `silent=false` — confirmed via grep, a direct, consistent precedent
  for render-function failures).
- **The 3 journalism companion loaders → `silent=true`**
  (`archive-timeline`, `upsets`, `market-consensus`). Reasoning: their
  own existing comments explicitly document them as "fire-and-forget"
  and "never blocks the main journalism render" — secondary,
  non-critical companion content, matching the relay-fetch precedent
  (background/supplementary data where the primary experience is
  unaffected) rather than the primary-render precedent.

**Preserved exactly, confirmed via full `git diff` review:** every
existing `typeof X === 'function'` guard, every existing call argument
(`renderRightNow(_fieldCurrentFilteredSports())`, the
`allData?.sports` check, `renderJournalismCompanion({ briefCount,
seriesCount, gameBriefCount })`), every surrounding comment. The diff
is purely additive — `catch(_) {}` → `catch(_) { captureFieldError(...); }`,
nothing else on any touched line.

## VERIFICATION

- **Real forced-failure test** (Node `vm`, extracted verbatim source —
  `captureFieldError` and `_fieldRefreshDynamicSurfaces`, not
  reimplemented): mocked all 6 renderer globals, made
  `renderScoreTicker` throw a real `Error`, ran the extracted function.
  Result: **all 6 renderers were called** (`espn-scores, score-ticker,
  watch-window, one-to-watch, right-now:["nba"], conflict-chip` — call
  order confirms the throw in #2 did not stop #3-6 from running),
  `window._fieldErrors` captured **exactly one** entry:
  `{fn: "surface:score-ticker", err: "DOM node #score-ticker not
  found — forced test failure", ts: ...}` — correct tag, correct
  message, isolation preserved. Test change was never applied to the
  committed file — it existed only inside the throwaway `vm` context.
- `git diff index.html` reviewed line-by-line: confirmed no renderer's
  actual behavior/arguments changed — every touched line's only
  difference is the catch block's contents.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: 21 failures — confirmed
  pre-existing and unrelated (same count as every prior commit
  tonight, unaffected by this change).

## POST-DEPLOY LIVE VERIFICATION — 2026-07-11 20:53 UTC

Deploy-gate run 29167813322 (commit `d6796c6`) completed
`status:completed conclusion:success` in 40s (20:52:52→20:53:32 UTC).

Fetched the live site with a real headless browser (not asserted):

- `window.SW_VERSION === "2026-07-11h"` — confirmed, matches this commit.
- `typeof captureFieldError === "function"` — confirmed.
- `typeof _fieldRefreshDynamicSurfaces === "function"` — confirmed.

All three genuinely present and correct in the deployed production
build, not just in source.

## DONE CONDITION

Every renderer in `_fieldRefreshDynamicSurfaces` — plus the 2
additional genuine clusters TASK 2 found (`renderAll()` tail,
journalism companion block) — now reports its real failure into the
existing `_fieldErrors` mechanism instead of discarding it silently.
Verified with a real forced-failure test showing correct tag capture
and preserved isolation, not asserted.

## CONFIDENCE SCORING

- +10 — TASK 1 confirms current state matches, drift reported honestly
  (1-line comment-block offset, not a real discrepancy): **met**
- +20 — TASK 2 genuine audit, not assumed isolated — found 2 more real
  clusters, individually checked and excluded 9 single-instance sites,
  and explicitly drew (and justified) the line against a much larger,
  differently-shaped SSE dispatcher rather than scope-creeping into
  it: **met**
- +35 — TASK 3 correctly reuses `captureFieldError`, no new parallel
  mechanism, existing call signatures/guards preserved exactly (12/12
  catch sites, confirmed via full diff review), `silent` reasoned
  per-function against the doc's own named precedent rather than
  defaulted: **met**
- +25 — Real forced-failure test constructed and verified: correct
  surface tag captured, all 5 other surfaces in the primary cluster
  unaffected: **met**
- +10 — `node smoke.js` clean: **met**

**Total: 100/100.**

## Commit

- `index.html`: 12 bare `catch(_) {}` blocks across 3 clusters
  (`_fieldRefreshDynamicSurfaces`, `renderAll()` tail, journalism
  companion block) now call `captureFieldError` with a `surface:*` tag
  and a reasoned `silent` value. `SW_VERSION` bumped `2026-07-11g` →
  `2026-07-11h`.
- `sw.js`: `SW_VERSION` synced to `2026-07-11h`.
- This manifest.
- **Flagged, not actioned**: the SSE dispatcher `_onMessage()`'s
  dozen-plus bare catches (different pattern, materially larger scope)
  — a genuine future CC-CMD candidate if this class of visibility gap
  is judged worth closing there too.
