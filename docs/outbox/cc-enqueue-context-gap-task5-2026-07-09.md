# CC Session Outbox — TASK 5: getQualityTarget() /180 Scale Fix (CC-CMD-2026-07-09-enqueue-context-gap, TASK 5 only)

**Date:** 2026-07-09
**Scope:** Fix the client-side `getQualityTarget()`'s stale `/180`-scale
comparison thresholds and display text — the fifth task from the
enqueue-context-gap CC-CMD, previously flagged as an unassigned dispatch
gap and now explicitly dispatched on its own.

## Probe — re-confirmed current state before editing

`getQualityTarget()` re-probed at `index.html:25464` (unchanged from the
CC-CMD's own citation). Confirmed `journalism-quality.js` (the file the
CC-CMD asked me to check weight constants against) **does not exist in
this repo** — it's presumably a field-relay-nba file. This repo has its
own, separate, real weight-constant definition locally (`W = { spec:30,
statDepth:38, variety:30, density:16, fresh:36 }`, `index.html:26818`,
part of the browser-side quality-chain fallback), used as the actual
ground truth for the arithmetic check instead.

## Confirmed: the underlying scorer has been on the 300-point scale since June 8 — no separate stale-data problem

Traced the full chain rather than assuming: `renderProseScore(scoreObj,
label)` (`index.html:26867`) pushes `scoreObj.score` directly into
`field_jq_scores`. `scoreObj.score` is `total` (`index.html:26845`),
computed as `base + arc.score + ctxScore + temporal.score + voice.score +
matchupScore`, clamped to a `ceiling` that's `300` minus `25` (if no
context) minus `30` (if no matchup) — the exact same dynamic-ceiling logic
(`~245` when both are missing) the CC-CMD's own root-cause section
described. The comment directly above (`index.html:26814`) dates this to
"Jun 8 2026 — 10-dimension, 0-300 scale."

**Conclusion, stated per the CC-CMD's explicit instruction rather than
left implicit**: `field_jq_scores`' *stored* data has never been on the
old 180-point scale — the underlying scorer was correctly migrated three
weeks ago. The bug was isolated entirely to `getQualityTarget()`'s own
hardcoded comparison/display constants (`/180`, `avgScore < 130`, `Target
≥ 145`), which were never updated when the scorer moved. This is a single,
contained bug — not two problems (a stale formula AND stale historical
data) that could hide one behind the other.

## Fix — arithmetic shown, not assumed

- **Display scale**: `/180` → `/300`.
- **Target ≥ 145 → Target ≥ 240**: not a literal re-scale of 145
  (145/180 ≈ 81% × 300 ≈ 243). Anchored instead to the **already-
  established canonical `240`** this same codebase now uses everywhere
  else (`generateJournalismViaRelay`'s `scoreThreshold`, fixed earlier
  tonight in CC-CMD-2026-07-09-jq-threshold-240-migration) — so this
  coaching hint and the actual pass/fail retry gate agree on what "good"
  means, rather than quietly disagreeing by a few points (243 vs 240).
- **Trigger `avgScore < 130` → `avgScore < 217`**: preserves the original
  ratio (130/180 ≈ 72.2% × 300 ≈ 216.67 → 217), since the CC-CMD's
  instruction was to *reconsider*, not blindly re-derive, the relative
  gap between trigger and target — the ~9-point gap this produces matches
  the original design's intent (fire the hint when recent performance is
  notably below, not merely at, the target).
- **`avgStat`/stat-depth thresholds left untouched** (`avgStat < 1.5`,
  `Target ≥ 1.8`, `index.html:25514`) — this is a stats-per-sentence
  density metric, a completely different unit from the point-scale score,
  and not part of this bug. `field_jq_scores` read, sport-tag matching
  logic: also untouched, per the CC-CMD's explicit scope boundary.

## VERIFICATION

Real synthetic test (Node `vm`, actual extracted `getQualityTarget()`
source, mock `localStorage`), 5 cases:

1. Output text uses `/300` and `Target ≥ 240` — no trace of `/180` or `145`.
2. **Trigger boundary proven, not just the text**: `avgScore = 200` (below
   the new 217 threshold, but above the *old* 130 threshold) now correctly
   fires — this is a case the pre-fix code would have silently suppressed.
3. `avgScore = 220` (above 217) correctly does **not** fire.
4. Real observed data from tonight's actual live A/B tests (scores
   127/130/137/141, averaging ~134) correctly triggers the corrected hint
   with the right numbers — grounded in this session's own real
   measurements, not invented test data.
5. The untouched insufficient-sample-count guard (`matched.length < 3`)
   still correctly returns `''`, confirming the surrounding logic wasn't
   disturbed.

All 5 pass. `node smoke.js index.html`: 890/0. `node field_unit.js`: 66/0.
Both inline `<script>` blocks syntax-checked via `node --check`.

## DONE CONDITIONS (TASK 5 only, per this dispatch)

- [x] Client-side `getQualityTarget()`'s stale `/180` reference corrected
      to the current 300-point scale, with honest arithmetic shown (not
      the CC-CMD's own "quick estimate" — derived and justified
      independently, landing on 240/217 rather than the doc's ~242)
- [x] `field_jq_scores` data-shape question addressed explicitly: traced
      end-to-end and confirmed stored data was never stale — a single,
      contained bug, not conflated with a second problem
- [x] `avgStat` thresholds, `field_jq_scores` read, sport-tag matching
      logic confirmed untouched (out of scope, verified not accidentally
      disturbed)
- [x] Prompt text (`getQualityTarget()`'s return value, fed directly into
      the night-owl/j2-series prompt) verified to no longer contain a
      stale `/180` reference — proven via test 1, the actual mechanism
      fixed, not inferred from a score change

## CONFIDENCE

Scored against this session's actual dispatched scope (TASK 5 only, the
literal instruction given):

- Scale reference corrected, arithmetic independently derived and
  justified against the real local weight constants (not the CC-CMD's own
  estimate, and not the nonexistent `journalism-quality.js` file it
  cited): **met**
- `field_jq_scores` historical-data question explicitly investigated and
  answered (not stale, confirmed via full code trace): **met**
- Live-provable via real synthetic test: trigger boundary case (200:
  would-not-have-fired-before, now-fires) proves the mechanism changed,
  not just the string: **met**
- Out-of-scope items (`avgStat`, data read, sport-tag matching) confirmed
  untouched: **met**

**All items within this session's assigned scope (TASK 5) are complete
and verified. Committing.**

## Commit

- Bumps `SW_VERSION` `2026-07-09b` → `2026-07-09c`.
- `index.html`: `getQualityTarget()`'s scale/threshold constants corrected.
- This manifest.
