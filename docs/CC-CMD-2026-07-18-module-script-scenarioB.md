# Claude Code Command — Module Script Scenario B: true ES module conversion, retire the globalThis bridge

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**Approved for execution.** This is the highest-stakes remaining piece of the whole esbuild/module thread — treat it with real caution, not routine confidence, even though it's authorized.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT — real, confirmed state going into this

- Scenario A (`type="module"` on the bundled IIFE) is live, verified, deployed.
- All 54 top-level `window.X=` assignments mapped and confirmed safe under module context (Playwright/Chromium evidence, `5c8ade2`).
- 13 inline-HTML-handler implicit globals now explicitly bridged (`5b603c0`) — a real prerequisite this CC-CMD depends on.
- `_DOM` (and possibly other variables) rely on `var` hoisting for early accessibility — hoisting itself is unaffected by module vs. classic script (a language-level behavior, not script-type-specific), but **re-confirm this explicitly rather than assume it from this note**.

**What Scenario B actually changes:** the current bundle wraps all of `field.js`'s content in an IIFE (`(function(){ ... })()`) inside a `<script type="module">` tag (Scenario A). Scenario B removes the IIFE — `field.js`'s top-level code becomes genuine module-top-level code. `src/main.js`'s current `globalThis.X = X` bridge pattern (used for all Phase 3-series extracted functions: `fmtGolfToPar`, `fieldTierRank`, etc.) becomes unnecessary — those functions can be imported directly via real `import` statements instead.

**Do not assume the full scope of "what needs to change" from this document alone — this is real, first-principles work requiring fresh investigation, not a checklist to execute blindly.**

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5

# Re-confirm current baseline
node smoke.js index.html 2>&1 | tail -3

# Re-confirm the real, current window.X= assignment count and list (should be 54 + 13 = 67,
# but re-derive fresh — don't assume from this doc)
grep -c "^window\.\|^  window\." src/legacy/field.js

# Re-confirm the real _DOM hoisting concern and any other var-hoisting-dependent patterns
grep -n "hoisted\|DOMContentLoaded" src/legacy/field.js | head -10

# Confirm the real, current Phase 3-series globalThis bridge count in main.js (should be 19+)
grep -c "globalThis\." src/main.js
```

Report real output for every probe before writing any code.

---

## TASK 1 — Real, fresh investigation: what genuinely changes under IIFE removal

This is not optional groundwork — do this before touching any code. For each of the following, get a real, current answer, not an assumed one:

1. **Deferred execution timing:** module scripts execute after DOM parsing completes (like `defer`). Confirm whether any code in `field.js` currently relies on running *during* DOM parsing (inline, before `DOMContentLoaded`) rather than after — if module scripts already execute after parsing regardless of IIFE removal (since Scenario A already made the script a module), removing the IIFE specifically shouldn't change this further. Confirm this reasoning is correct with real evidence, don't just assert it.

2. **Var/function hoisting scope:** with the IIFE removed, top-level `var`/`function` declarations move from IIFE-function-scope to module-top-level-scope. Both are non-global scopes (confirmed in the original investigation), so this shouldn't introduce new implicit-global leakage — but confirm this holds for every one of the real, current top-level declarations, not just a sample.

3. **The 67 total window.X= assignments (54 + 13):** with the IIFE removed, do these assignments still fire at the same relative point in execution order? Confirm via real code inspection, not assumption.

4. **`src/main.js`'s own real, current structure:** for Scenario B to actually simplify anything, `main.js` needs real changes too — real `import { fmtGolfToPar } from './legacy/field.js'`-style imports would require `field.js` to have real `export` statements for those 19+ functions, which it currently doesn't (they're plain function declarations, made available via the `globalThis` bridge from `main.js`'s side, not real exports from `field.js`'s side). Confirm the real, current shape and scope this correctly — this may be a real, substantial piece of TASK 2, not a trivial one.

## TASK 2 — Implement, incrementally, with real verification at each step

Based on TASK 1's real findings (not assumed from this doc), implement the conversion. Suggested real order, adjust based on what TASK 1 actually finds:
1. Remove the IIFE wrapper from `field.js` (or from the build step, wherever it's actually applied — confirm the real, current location first)
2. Add real `export` statements to the Phase 3-series extracted functions currently bridged via `globalThis` in `main.js`
3. Convert `main.js`'s `globalThis.X = X` lines to real `import { X } from './legacy/field.js'` — confirm whether `X` still also needs to remain a `window` property for anything else in `field.js` itself to keep working (the 67 mapped assignments may need to stay as explicit `window.X=` regardless of the import change)
4. Real smoke check after each real, discrete change — not one big batch

**Do not attempt this as a single, monolithic diff.** If TASK 1 reveals this is larger or riskier than expected, stop, report the real finding, and treat completing it as requiring a follow-up CC-CMD rather than forcing it through in this dispatch.

## TASK 3 — Real, thorough verification

Full local pipeline: `sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` → bundled-output regression check (matching the real, established baseline from Scenario A's own verification, not assumed unchanged). Real, functional check — not just "smoke passes," but confirm actual runtime behavior for a real sample of features (a live schedule render, a Debrief card, an inline `onclick` handler) genuinely still works, matching the standard the whole esbuild thread has held all night.

## TASK 4 — Real diff and live verification

```bash
git diff --stat
```

Real commit(s) — multiple discrete commits if TASK 2's incremental approach produces them, not forced into one. Real live CI confirmed via actual job logs (check the raw check-runs API directly, not just a summary claim — the established standard after tonight's own discrepancy). Real live content check.

---

## DONE CONDITION

Either: Scenario B genuinely, fully implemented — IIFE removed, real exports/imports replacing the `globalThis` bridge, all 67 window assignments confirmed still correct, real live verification via job logs and functional checks. Or: TASK 1's real investigation finds this is larger/riskier than the approved scope reasonably covers in one dispatch, honestly reported with a specific, scoped follow-up CC-CMD proposed rather than forced through incompletely.

**Confidence scoring:**
- TASK 1 (35 pts): real, thorough, first-principles investigation — not assumed from this document
- TASK 2 (30 pts): real, incremental implementation with verification at each step, or an honest, specific stop if scope exceeds what's safe for one dispatch
- TASK 3 (20 pts): real, functional verification beyond just smoke passing
- TASK 4 (15 pts): real diff, real live CI confirmed via raw job-log inspection, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
