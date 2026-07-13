# Claude Code Command — Cap captureFieldError()/window._fieldErrors before any high-frequency Bucket B migration

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** `captureFieldError()` only. Zero Bucket B migrations happen in this CC-CMD — this is the prerequisite that makes them safe.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md.

Write findings to outbox/cc-capturefielderror-cap-2026-07-13.md.

## CONTEXT — a real, unaddressed risk found before it manifested, not after

`captureFieldError(fn, err, silent=true)` (~L4948) pushes unconditionally into `window._fieldErrors` on every call — no size cap, no per-`fn` rate limit, no dedup. The general Bucket B sweep (`docs/TYPED-RESULT-MIGRATION-QUEUE.md`, 281 sites) is about to start adding `captureFieldError()` calls at scale, including to functions with real call-site counts of 30+ (`renderAll`), 25 (`findESPNScore`), ~15 (`renderProseScore`, `renderESPNScores`), 14 (`dramaScoreLive`). If any of those failure branches fires repeatedly over a long session — plausible for per-game, per-poll-cycle functions — "safe, decorative-only telemetry" becomes an unbounded array, degrading memory and making the Health Panel useless (real signal drowned in duplicate noise). This must land before any high-frequency function gets touched, not after a problem is observed.

**No fallback, only a fix — stated explicitly:** the fix is a real cap with real eviction, not a silent early-return that quietly drops entries without anyone knowing. Dropped-due-to-cap entries should themselves be countable (e.g., a running "dropped" counter), so the Health Panel can show "N more suppressed" rather than silently under-reporting.

## TASK 0 — Probe

```bash
grep -n "function captureFieldError" -A10 index.html
grep -n "_fieldErrors" index.html | head -20
grep -n "buildFieldHealthPanel" -A5 index.html | head -15
```

Confirm the exact current implementation and every real consumer of `window._fieldErrors` (the Health Panel and any other reader) before changing the write side — a cap that breaks an existing reader's assumption about array shape would be a real regression.

## TASK 1 — Add a cap and a per-fn rate limit

Two independent protections, both real:

1. **Size cap**: `window._fieldErrors` should not grow unbounded. Cap at a real number (e.g., 500 — pick based on what's reasonable for the Health Panel's own display needs, check if TASK 0 reveals a natural limit already implied by how it's rendered) using a ring-buffer/eviction pattern (drop oldest on overflow), not a silent stop-recording.
2. **Per-`fn` rate limit**: if the same `fn` label fires repeatedly within a short window (e.g., more than once per 60 seconds), collapse into one entry with a `count` field incremented, rather than N separate entries. This is what actually prevents flooding from a single misbehaving high-frequency function, independent of the overall size cap.

Both protections must be visible, not silent — track and expose a real `_fieldErrorsDropped` (or equivalent) counter so the Health Panel can honestly show suppression is happening, rather than the array just quietly capping with no indication anything was lost.

## TASK 2 — Verification

- Real forced test: call `captureFieldError` with the same `fn` label 100 times in a tight loop, confirm the result is one entry with `count:100` (or the real chosen shape), not 100 separate entries.
- Real forced test: call `captureFieldError` with 600 distinct `fn` labels (above the cap), confirm the array caps at the real chosen size and the drop counter reflects the real overflow count.
- Confirm the Health Panel (or any other real consumer found in TASK 0) still renders correctly against the new shape — a consumer expecting exactly the old flat-array-of-single-entries shape would need updating, not silently break.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

`window._fieldErrors` cannot grow unbounded and cannot be flooded by a single repeatedly-firing `fn` label, proven via real forced tests for both properties. Suppression is visible (a real counter), not silent. Every real consumer of the old shape still works or was updated. This unblocks — but does not itself perform — any high-frequency-function Bucket B migration.

**Confidence scoring:**
- TASK 0 probe finds every real consumer of `window._fieldErrors`, not assumed (15 pts)
- TASK 1 size cap uses real eviction, not silent stop-recording (25 pts)
- TASK 1 per-fn rate limit correctly collapses repeats with a real count, not just suppressing (25 pts)
- Suppression is visible via a real counter, not silent (10 pts)
- TASK 2 both forced tests proven, all consumers confirmed working against the new shape (25 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
