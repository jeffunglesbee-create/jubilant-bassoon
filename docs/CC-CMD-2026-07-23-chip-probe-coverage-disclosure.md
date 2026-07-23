# CC-CMD: Coverage disclosure in chip_overflow_probe.js (surgical, small)

**Date:** 2026-07-23
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** `chip_overflow_probe.js` only. One thing. Nothing else in this
repo needs touching — the CSS fix, the grid-column fix, and the
`[object Object]` fix are all independently confirmed correct and
complete as of the last fresh pull. Do not re-touch any of that.

**Why — the one specific, confirmed-remaining gap.** Directly confirmed
on a fresh pull: `chip_overflow_probe.js` has no `coverageSufficient` or
similar field. `allPass:true` currently reads identically whether 1 chip
was measured or 20. The prior session's explanation for low counts
(slate-timing — few live games at probe-fire-time, not a probe defect)
is accepted as plausible and is NOT being re-litigated here. This
CC-CMD's job is narrower than "fix coverage" — it's "make it impossible
to read ALL PASS without also seeing how thin the sample was."

**Explicitly NOT the design from the prior CC-CMD:** do not add a hard
pass/fail threshold that fails the run below some fixed chip count —
given slate-timing legitimately varies, a fixed floor would produce
false failures on genuinely fine days with few live games. This is a
disclosure fix, not a gate.

**Target time:** ~10 min. This should be small.

---

## Do NOT Touch

- Any CSS in `index.html`.
- `field.js:735`'s stream-label extraction.
- The wait condition or `.stream-row` overlap-scope selector — both are
  fine as-is; nothing about this fix requires touching them.
- Anything outside `chip_overflow_probe.js`.

---

## TASK 1 — Add coverage disclosure

In `chip_overflow_probe.js`, near where `allPass` is computed:

```js
const totalChips = measurements.length;
const overflowingChips = measurements.filter(m => m.overflows);
const allPass = overflowingChips.length === 0 && overlapPairs.length === 0;
const LOW_COVERAGE_THRESHOLD = 3;
const lowCoverage = totalChips < LOW_COVERAGE_THRESHOLD;
const coverageNote = lowCoverage
  ? `LOW COVERAGE: only ${totalChips} chip(s) measured this run -- a pass here does not confirm the fix broadly. Re-trigger during a busier live slate for real confidence.`
  : null;
```

Add `lowCoverage` and `coverageNote` to the manifest object (alongside
the existing `totalChipsMeasured`, `allPass`, etc. — additive, don't
restructure the existing fields).

## TASK 2 — Make it unmissable in the console summary, not just the JSON

The current console output ends with a line like `Result: ALL PASS ✓`.
That line must never print alone when `lowCoverage` is true — either
append the coverage note to the same line, or print it immediately
before/after with equal visual weight (not buried below). Someone
skimming CI output should not be able to see "ALL PASS" without also
seeing the coverage caveat in the same glance.

## TASK 3 — Real verification (per Rule 90, VERIFY-ARTIFACT-A)

Trigger the probe once against the live deployed URL. The new manifest
must show `lowCoverage: true` and a real, non-null `coverageNote` string
(current slate conditions make this the expected, honest outcome — that
is fine and correct, not a failure of this fix). Paste the actual
console output showing the coverage note is visually adjacent to the
pass/fail line, not just present somewhere in the JSON.

## TASK 4 — Outbox manifest

Small session, small manifest — but still required, per standing
instruction. Confirm: exact diff (should be a handful of lines), the
real triggered-run's manifest values, and the console output excerpt
from TASK 3.

---

## Done Condition

Live-triggered manifest includes `lowCoverage` and `coverageNote` fields
with real values (not placeholders). Console output makes the coverage
caveat visible in the same glance as the pass/fail result, confirmed by
pasting the actual output, not describing it.

**Confidence scoring:**
+30 Fields added correctly, additive, nothing else touched
+30 Console output genuinely surfaces the caveat adjacent to the
    pass/fail line, not buried
+30 Real triggered run, real manifest values pasted, not assumed
+10 Small, honest outbox manifest

Automate follow-ups. No fallbacks, only fixes — if this reveals the
console-output change is more involved than expected because of how
logging is structured elsewhere in the file, fix it properly rather than
adding a second, redundant log line that leaves the original
misleading one intact.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-23-chip-probe-coverage-disclosure.md
-- small, surgical fix, nothing else in the repo needs touching. Add
lowCoverage + coverageNote fields to chip_overflow_probe.js's manifest
output (threshold 3, no hard pass/fail gate -- disclosure, not a gate,
since slate-timing legitimately varies). Make the console summary show
the coverage caveat in the same glance as ALL PASS, not buried in JSON
only. Trigger once live, paste the real manifest values and console
output. Automate follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
