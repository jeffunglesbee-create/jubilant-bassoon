# Claude Code Command — Make relay-init failures visible across all 9 functions, not silent

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** 9 functions (`mlbProbablePitcherInit`, `mlbPitcherStatsInit`, `mlbStatsInit`, `nbaPlayerCluichInit`, `nhlSeriesInit`, `nbaCluichInit`, `nhlGSAXInit`, `soccerFBrefInit`, `uflEpaInit`) share one pattern: fetch fresh analytics from the relay to overlay hardcoded stub constants, and on any failure (timeout, non-200, parse error), silently keep the stub data with zero signal anywhere that the overlay didn't happen. A user has no way to know whether a displayed stat is today's real number or an old hand-written stub. This is a real integrity gap, not a style issue — fix the visibility, not the graceful degradation itself.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-relay-init-staleness-visibility-2026-07-11.md.

## IMPORTANT — do not remove the try/catch. Fix what's inside it.

The graceful-degradation behavior (page keeps working on a relay hiccup, doesn't crash) is correct and should NOT change. What must change: the failure currently produces zero trace anywhere. Removing the try/catch entirely would make a single relay blip break page load — strictly worse for users. This is a visibility fix, not a resilience removal.

## TASK 1 — Confirm the actual current list and blast radius

Re-grep for the exact 9 function names above from HEAD. Confirm the list is complete and unchanged (report if a 10th exists or one of the 9 no longer does). For each, identify what data it overlays and roughly how many UI surfaces read that data — this determines whether staleness matters cosmetically or for a user-facing decision (e.g., "is this game worth watching" logic should never silently run on stale inputs; a clutch-DRTG badge is lower stakes). Report this triage honestly — not every one of the 9 carries equal weight.

## TASK 2 — Add a shared staleness-tracking primitive

A single, small, reusable piece of state — e.g. `window._relayInitStatus = {}` — where each of the 9 functions records, on both success and failure:
```js
_relayInitStatus[name] = { ok: bool, at: ISOString, error: string|null };
```
Set this at the point of success (fresh data applied) and at the point of failure (stub retained) — both branches, not just the failure one, so "confirmed fresh" and "confirmed stale" are both real, checkable states, never an unknown third case.

## TASK 3 — Surface it in the FIELD Health Panel

Add a row (or section, if 9 individual rows is too dense — group logically, e.g. by sport) to the existing Health Panel showing each function's last status — a simple ✅ fresh / ⚠️ stale-since-{time} per entry. Reuse the Health Panel's existing rendering pattern (the same one already used for CI/MCP/journalism status) — do not invent a new UI pattern for this.

## TASK 4 — Decide, per data point, whether user-facing staleness matters beyond the dev-facing Health Panel

For each of the 9, make an explicit, reported decision: does this specific stat ever get surfaced in a context where a user might reasonably assume it's current (e.g., a "why this game matters" narrative citing clutch DRTG)? If yes, that specific surface needs a lightweight indicator too (not necessarily a full badge — even a title/tooltip attribute noting "may not reflect today's data" is enough). If no — the data is genuinely cosmetic/rarely-surfaced — say so explicitly rather than adding UI nobody needed. Do not apply a blanket answer to all 9; they are not equally consequential.

## VERIFICATION

- Construct a real test: force one of the 9 (e.g. temporarily point its relay URL at a 404) and confirm `_relayInitStatus` records the failure correctly and the Health Panel reflects it. Then restore and confirm a success case also records correctly. Clean up the test change afterward.
- Confirm none of the 9 functions' actual fetch/overlay logic changed — this is additive instrumentation, not a rewrite of the data path.
- `node smoke.js` clean.

## DONE CONDITION

All 9 functions report their real status (success or failure) into one shared, checkable state. The Health Panel surfaces it. TASK 4's per-function decision on user-facing visibility is made and reported honestly, not defaulted the same way for all 9. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 triage genuinely done, not treated as uniform (15 pts)
- TASK 2 staleness primitive correctly records both success and failure for all 9 (25 pts)
- TASK 3 Health Panel integration reuses existing pattern, genuinely visible (25 pts)
- TASK 4 per-function user-facing decision made and justified individually (20 pts)
- Real failure/success test constructed and verified live, not asserted (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.