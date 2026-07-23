# CC-CMD: Chip overflow probe — broaden coverage, fix root causes of the gap

**Date:** 2026-07-23
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Supersedes:** Nothing in the prior CC-CMD's fix (`.watch-now-btn`/
`.stream-chip` CSS) — that part is confirmed correct via direct source
read. This is a follow-up to TASK 2 of
`CC-CMD-2026-07-23-chip-overflow-containment.md` specifically — its own
verification (`chip_overflow_probe.js`) shipped but only measured 1 chip
total out of at least 5 distinct instances visible in the original bug
screenshot (IMG_9631: 2× watch-now-btn wraps, 2-3× stream-chip
overflows/overlaps).

**Why — a real, root-caused gap, not a hypothetical.** Read the actual
probe script (`chip_overflow_probe.js`) and its output manifest
directly. Two real causes found, not guessed:

1. `page.waitForTimeout(1000)` after cards first appear is likely not
   enough for every sport section to finish rendering — FIELD's boot
   sequence stages multiple async fetches (per CODE_MAP.json's own
   ~200+ boot calls), and the probe's own `hasCards` check only requires
   >=1 chip to exist anywhere before proceeding, not a stable/complete
   render.
2. The sibling-overlap check scopes to `document.querySelectorAll('.stream-row')`
   as the parent container. This class was never independently confirmed
   against the actual DirecTV/calendar-icon overlap or the AFL cards'
   broadcast rows during the original diagnosis — if `.stream-row`
   doesn't match the real container class those specific elements live
   in, overlap detection silently finds nothing to check there,
   regardless of whether real overlaps exist.

There's also a real, secondary bug: one manifest entry showed
`"label": "[object Object]"` despite the script's own label logic being
`el.textContent.trim().slice(0,40)`, which should always yield a string.
Reproduce and root-cause this too, don't dismiss it as a fluke.

**Target time:** ~25 min

---

## Do NOT Touch

- The CSS fix itself (`.watch-now-btn`/`.stream-chip` in `index.html`) —
  confirmed correct, not in scope here.
- `ambient-skeleton-probe.yml` or any other unrelated workflow.

---

## Pre-Build Probe (run FIRST)

```bash
git log --oneline -5
cat chip_overflow_probe.js
cat outbox/chip-overflow-probe-manifest-*.json | python3 -m json.tool | tail -40
grep -n "stream-row" src/legacy/field.js index.html | head -10
```
Confirm: (a) is `.stream-row` actually the class wrapping the chips shown
overlapping in IMG_9631 (the DirecTV/calendar-icon collision, the AFL
"Fox Soccer Pl..." row)? If not, find the real one. (b) Reproduce the
`[object Object]` label locally/via a targeted script if possible to
understand which specific element triggers it, rather than assuming a
fix without reproducing the actual cause.

## TASK 1 — Fix the wait condition

Replace the fixed `page.waitForTimeout(1000)` with something that
actually confirms render stability — e.g., wait for a minimum expected
chip count (poll `document.querySelectorAll('.stream-chip, .watch-now-btn').length`
until it stabilizes across two checks 500ms apart, or reaches a sane
floor like >=5 for a multi-sport night), or wait for network idle on the
page's data-fetch calls specifically if there's a cleaner signal
available. Pick whichever the probe shows is actually reliable — don't
just increase the fixed timeout number as a guess.

## TASK 2 — Fix the overlap-detection container scope

Based on the probe's finding in the Pre-Build Probe step, use the real
container class (may still be `.stream-row`, may not be — confirm, don't
assume either way this time).

## TASK 3 — Root-cause and fix the `[object Object]` label bug

Find the actual element/condition that produces this and fix the real
cause, not a defensive `String()` wrapper that papers over an unknown
root cause without understanding it.

## TASK 4 — Add a minimum-coverage self-check to the manifest itself

Add a field like `expectedMinimumChips` (a reasonable floor given a
typical multi-sport night — check `hasCards`-adjacent context for a
sane number, or just use a conservative floor like 5) and
`coverageSufficient: totalChipsMeasured >= expectedMinimumChips`. If
`coverageSufficient` is false, the probe should still commit its
results (useful signal either way) but `allPass` must NOT be reported as
true regardless of the overflow/overlap findings — thin coverage passing
is exactly the gap this follow-up exists to close, and it should be
structurally impossible for a future run to repeat it silently.

## TASK 5 — Real re-verification (VERIFY-ARTIFACT-A compliant, this is
the actual point)

Re-run the probe against the live deployed site. The new manifest must
show `totalChipsMeasured` meaningfully higher than 1 (ideally covering
all the chip types visible in a real multi-sport night), `coverageSufficient: true`,
and genuinely zero overflows/overlaps across that broader set — not
reported, actually measured.

## TASK 6 — Outbox manifest (per Jeff's explicit standing requirement:
outboxes at the very least, every time, no exceptions)

Write a complete, honest outbox manifest — not a placeholder. Must
include: the real root cause found for each of the three gaps (wait
condition, overlap scope, object-Object label), the exact fix for each,
the new manifest's real `totalChipsMeasured`/`coverageSufficient`/
`allPass` values, and the screenshot path. If any of the three root
causes couldn't be fully confirmed, say so explicitly rather than
implying full confidence — an honest partial finding is acceptable, a
silently-assumed one is not.

---

## Done Condition

Live-verified: `chip-overflow-probe-manifest-*.json`'s newest entry shows
`coverageSufficient: true`, `totalChipsMeasured` meaningfully above 1,
`allPass: true` on the broader set, zero `[object Object]`-style labels
in the measurements array. Outbox manifest is complete per TASK 6, not
minimal.

**Confidence scoring:**
+15 Pre-Build Probe's two questions genuinely answered with evidence
+20 Wait-condition fix (T1) — real render-stability check, not a bigger
    guessed timeout
+20 Overlap container scope confirmed/fixed (T2)
+15 `[object Object]` root-caused and fixed (T3), not papered over
+15 Minimum-coverage self-check added (T4) — this is what prevents this
    exact gap from recurring silently
+10 Real broader re-verification (T5) with a materially higher chip count
+5  Complete, honest outbox manifest (T6) — non-negotiable per Jeff's
    standing instruction, score this at 0 if the manifest is thin

Automate follow-ups. No fallbacks, only fixes — if `.stream-row` turns
out not to be a real class anywhere and there's no clean single parent
selector for chip rows, do not invent one; find how these rows are
actually structured and adapt the check to the real DOM shape.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-23-chip-probe-coverage-followup.md --
the chip overflow probe shipped but only measured 1 of 5+ real chip
instances from the original bug screenshot. Root-cause and fix: the
fixed 1s wait probably isn't enough for all cards to render, the overlap
check's .stream-row container scope was never confirmed against the real
overlapping elements, and there's an unexplained "[object Object]" label
bug. Add a minimum-coverage self-check so allPass can never report true
on thin coverage again. Re-verify live with a materially higher chip
count measured. Outbox manifest is mandatory and must be complete, not
minimal -- explicit standing requirement, not optional. Automate
follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
