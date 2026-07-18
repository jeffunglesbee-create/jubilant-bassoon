# Claude Code Command — esbuild Phase 7 (corrected): extract isFeaturedTierGame alone, MY_TEAMS stays in field.js

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

The original Phase 7 correctly, honestly stopped rather than force an extraction — `MY_TEAMS` is real, live, mutable user-preference state (`let`, populated from `localStorage`, mutated via a real add/delete toggle, persisted back, broadcast to the service worker — 40 real references in `field.js`), categorically different from Phase 5/6's static constants. Its own investigation named two valid paths forward; this CC-CMD is Option A.

**`MY_TEAMS` itself is explicitly, permanently out of scope — not just deferred.** Do not extract it, do not add a `globalThis.MY_TEAMS` bridge for it, do not touch its declaration or mutation sites in `field.js` at all. This CC-CMD extracts only the pure predicate function that reads it.

`isFeaturedTierGame` (L6690, per the prior investigation — re-confirm current line) reads `MY_TEAMS` as a plain identifier and calls `isScoutsPick` (already bridged via Phase 3). Extracting it means it resolves `MY_TEAMS` the same way — as a bare global read against whatever `field.js` still owns and mutates directly. No bridge needed for `MY_TEAMS` because it never leaves `field.js` in the first place.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "function isFeaturedTierGame" src/legacy/field.js
grep -n "let MY_TEAMS" src/legacy/field.js
grep -n "globalThis.isScoutsPick" src/main.js
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real confirmation

Confirm `isFeaturedTierGame`'s real current body and line number. Confirm `MY_TEAMS`'s declaration remains genuinely untouched by this plan (it should — this CC-CMD never edits it). Confirm `isScoutsPick`'s real, current `globalThis` bridge status (should already exist from a Phase 3-series extraction — verify which one, don't assume). Confirm zero smoke assertions reference `isFeaturedTierGame` by name.

## TASK 2 — Extract only isFeaturedTierGame

`src/utils/tier-game.js`: `export function isFeaturedTierGame(g) { ... }` — exact body preserved, still reading `MY_TEAMS` and calling `isScoutsPick` as bare identifiers (no import of either inside this new module — they resolve at runtime via the existing/global scope, same as every `field.js`-internal cross-reference always has). `src/main.js`: import + `globalThis.isFeaturedTierGame = isFeaturedTierGame`. `field.js`: original body replaced with a stub comment, no import added.

**Explicitly confirm `MY_TEAMS`'s own declaration in `field.js` is completely unmodified by this commit** — a real diff check, not just "I didn't intend to touch it."

## TASK 3 — Real call-site verification

Confirm every real caller of `isFeaturedTierGame` in `field.js` still resolves correctly, and confirm the extracted function itself correctly reads live `MY_TEAMS` state at call time (not a stale snapshot) — a real, live-behavior check, not just "the import resolved without error."

## TASK 4 — Full local pipeline dry-run

## TASK 5 — Real live verification

Real job logs, real post-deploy content check. Given this function reads live user-preference state, also confirm (via real code inspection, not just a generic smoke pass) that the extraction genuinely didn't change *when* `MY_TEAMS` gets read relative to when a user's toggle action updates it — no new staleness window introduced.

---

## DONE CONDITION

`isFeaturedTierGame` extracted cleanly into its own module, `MY_TEAMS` completely untouched in `field.js`, all real call sites verified including live-state-read correctness, full pipeline proven via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation, especially that MY_TEAMS remains untouched
- TASK 2 (30 pts): clean extraction, real diff confirmation MY_TEAMS wasn't modified
- TASK 3 (20 pts): real call-site verification including live-state-read correctness
- TASK 4 (10 pts): full local pipeline dry-run clean
- TASK 5 (20 pts): real live CI run confirmed via job logs, real post-deploy content check, no new staleness window

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
