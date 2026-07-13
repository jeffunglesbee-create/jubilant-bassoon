# Claude Code Command — Two missing structural existence assertions from July 12 ET

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** smoke.js only. Two new assertions, pure additions.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md.

Write findings to outbox/cc-missing-july12-assertions-2026-07-13.md.

## CONTEXT — found via a direct audit, not assumed

Two July 12 ET commits introduced permanent, named functions with no structural existence check protecting them:

1. `c6f632c2` (23:21 ET) — `fieldOperation()`, `FIELD_OPERATIONS`, `classifyFieldError()`. Confirmed via grep: zero `assert()` conditions reference any of the three names (only a code comment does).
2. `f2c7413c` (23:49 ET) — `_otwMarginTier`, `_otwIsFinalPeriod`, `_otwIsCrunchTime`. `A494`'s existing condition checks `_otwGetLiveTier`/`_otwTierLabel` plus string literals, but never these three — they appear only in A494's own descriptive text, not its actual boolean check.

## TASK 0 — Probe

```bash
grep -n "function fieldOperation\|FIELD_OPERATIONS\s*=\|function classifyFieldError" index.html
grep -n "function _otwMarginTier\|function _otwIsFinalPeriod\|function _otwIsCrunchTime" index.html
grep -n "^assert('A494" -A8 smoke.js
```

Confirm all five functions/constants still exist at their described names before writing assertions against them — re-check, don't assume from this doc.

## TASK 1 — Add a new assertion for fieldOperation()/FIELD_OPERATIONS/classifyFieldError

Follow the file's existing convention exactly (see any recent `A6xx`+ assertion for the current numbering/style). Check real existence:
```javascript
html.includes('function fieldOperation(') &&
html.includes('const FIELD_OPERATIONS') &&
html.includes('function classifyFieldError(')
```

## TASK 2 — Extend A494 (or add a new sibling assertion) to cover the 3 OTW helpers

Prefer extending A494 itself if that doesn't make its single assertion unreasonably overloaded (it's already checking 2 functions + 3 string literals; 3 more existence checks is consistent with its own stated scope, since its rationale text already claims to describe them) — otherwise add `A496` (or the real next-available number, re-confirmed fresh) as a dedicated sibling. State which choice was made and why.

## TASK 3 — Verification

- `node smoke.js`: confirm the new assertion(s) pass, confirm they'd genuinely fail if the guarded functions were removed (temporarily rename one, confirm the assertion catches it, restore).
- `node field_unit.js`, `node field_smoke.js` unaffected.
- Write outbox manifest per Rule 87.

## DONE CONDITION

Both gaps closed with real existence assertions, each proven to actually fail on a real removed-function test before being confirmed passing again. No other assertions touched.

**Confidence scoring:**
- TASK 0 probe re-confirms all 5 names before writing checks against them (15 pts)
- TASK 1 correct, matches file convention (30 pts)
- TASK 2 correct, A494-extend-vs-sibling choice stated with reasoning (30 pts)
- TASK 3 real fail-then-pass proof for both, not just observed passing (25 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
