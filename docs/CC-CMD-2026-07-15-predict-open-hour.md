# Claude Code Command — Wire predictNextOpenHour into the anticipatory prefetch scheduler

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-predict-open-hour-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`recordOpenHour()` fires unconditionally at every boot, building a real 24-bucket open-hour histogram in `localStorage['field-open-hist']` — genuine user-behavior data, continuously collected. `predictNextOpenHour()` (median-of-top-3-buckets, outlier-resistant) reads that same histogram and is fully built, but never called. `registerAnticipatoryPrefetch()` — the function that logically should consume this prediction — instead registers a generic 24-hour-interval periodic background sync (`field-prewarm`), with no connection to the predicted hour at all.

## TASK 0 — Probe

Read `registerAnticipatoryPrefetch`'s real, current implementation in full, and the real periodicSync API's actual capabilities (`minInterval` is the only real scheduling lever it exposes — confirm whether a *specific* predicted hour can genuinely influence a periodicSync registration, or whether the real API constraint means the prediction can only inform something else, like which data to prewarm rather than exactly when). Do not assume the prediction can be wired in the way that seems obvious without checking what the real API allows.

## TASK 1 — Fix

Based on TASK 0's real findings on what's actually possible: wire `predictNextOpenHour()`'s output into `registerAnticipatoryPrefetch` in whatever way the real API constraints allow — narrowing the prewarm window, prioritizing which data gets prewarmed, or logging/informing a different real mechanism if periodicSync genuinely can't take a specific hour.

## TASK 2 — Verify

Real forced-condition test: a synthetic 24-bucket histogram with a clear peak produces the expected predicted hour via `predictNextOpenHour()`, and that value is confirmed to reach and influence the prefetch registration path. Confirm the empty/insufficient-history case (real early-adoption scenario, fewer than 24 real data points) still degrades gracefully to the current generic behavior.

## DONE CONDITION

Real, collected user open-hour data genuinely influences prefetch behavior, within whatever real constraints the periodicSync API actually imposes — verified via forced test, with graceful fallback for users without enough history yet.

**Confidence scoring:**
- TASK 0 (35 pts): confirms real periodicSync API constraints before designing, doesn't assume more control is possible than the API actually offers
- TASK 1 (35 pts): wires the prediction in within real constraints
- TASK 2 (30 pts): real forced test, graceful degradation for insufficient-history case confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
