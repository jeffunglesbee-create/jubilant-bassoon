# CC Session Outbox — two missing structural existence assertions (CC-CMD-2026-07-13-missing-july12-assertions)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). smoke.js only, two new assertions.

## TASK 0 — Probe (re-confirmed fresh, not assumed from the CC-CMD doc)

```
grep -n "function fieldOperation\|FIELD_OPERATIONS\s*=\|function classifyFieldError" index.html
4960:const FIELD_OPERATIONS = {
4972:async function fieldOperation({
4991:function classifyFieldError(error) {

grep -n "function _otwMarginTier\|function _otwIsFinalPeriod\|function _otwIsCrunchTime" index.html
37301:function _otwMarginTier(eData, sport) {
37320:function _otwIsFinalPeriod(eData, sport) {
37345:function _otwIsCrunchTime(eData, sport) {

grep -n "^assert('A494" -A8 smoke.js
```

All 5 names confirmed still present at HEAD. `A494`'s actual boolean check
confirmed to reference only `_otwGetLiveTier`/`_otwTierLabel` + 3 string
literals — never the 3 OTW helper names, matching the CC-CMD's claim.

**Numbering correction:** the CC-CMD guessed `A496` as the next-available
sibling number if one were needed. The real highest numeric assertion at
HEAD is `A739` (confirmed via
`grep -oE "^assert\('A[0-9]+" smoke.js | grep -oE "[0-9]+" | sort -n | tail`),
so the new assertion is `A740`, not `A496`.

## TASK 1 — New assertion for fieldOperation()/FIELD_OPERATIONS/classifyFieldError

Added `A740`, appended at end of file (matching the file's own convention
of appending newly-added assertions in chronological/commit order, as
seen with the `A-RENDERGATE-*` block immediately preceding it):

```js
assert('A740 — fieldOperation()/FIELD_OPERATIONS/classifyFieldError() exist',
  html.includes('function fieldOperation(') &&
  html.includes('const FIELD_OPERATIONS') &&
  html.includes('function classifyFieldError('),
  '...');
```

## TASK 2 — A494 extended (not a sibling assertion)

**Choice: extended A494** rather than adding a dedicated sibling. Reasoning:
A494 already checks 2 functions + 3 string literals for this exact
categorical-tier-refactor feature, and its own rationale text (the
2026-07-12 addendum) already explicitly named all 3 raw-observable helpers
as part of what the refactor covers — the boolean check just never
verified their existence. 3 more `html.includes('function ...(')` checks
is consistent with A494's own already-stated scope, not an overload of a
narrower assertion. Added:

```js
html.includes('function _otwMarginTier(') &&
html.includes('function _otwIsFinalPeriod(') &&
html.includes('function _otwIsCrunchTime(')
```

to A494's condition, plus a dated addendum to its rationale text
explaining the gap and the extend-vs-sibling decision.

## TASK 3 — Real fail-then-pass proof (not just observed passing)

Tested against temporary copies in the scratchpad dir, never against the
committed `index.html`:

| Assertion | Action | Result |
|---|---|---|
| A740 | Copied `index.html`, renamed `function fieldOperation(` → `function fieldOperationRENAMEDTEST(` | `❌ A740` fails, all else passes (919/1) |
| A740 | Restored (test copy discarded) | real `index.html` unaffected |
| A494 | Copied `index.html`, renamed `function _otwMarginTier(` → `function _otwMarginTierRENAMEDTEST(` | `❌ A494` fails, all else passes (919/1) |
| A494 | Restored (test copy discarded) | real `index.html` unaffected |

Both assertions proven to genuinely catch a removed/renamed guarded
function, not just observed passing against unmodified code.

Final state, real `index.html`:
- `node smoke.js index.html`: 920 passed, 0 failed (919 → 920, +1 net new assertion; A494 extended in place, doesn't add a count).
- `node field_unit.js`: 66 passed, 0 failed (unaffected, as expected — smoke.js-only scope).
- `node field_smoke.js index.html`: exit 0 (unaffected, as expected).

No assertion other than A494 (extended) and A740 (added) was touched.

## Confidence score

- TASK 0 probe re-confirmed all 5 names, found the CC-CMD's assumed sibling number (A496) was stale vs. real HEAD (A739→A740 used instead): 15/15
- TASK 1 correct, matches file convention exactly: 30/30
- TASK 2 correct, extend-vs-sibling choice stated with reasoning: 30/30
- TASK 3 real fail-then-pass proof for both, via temporary file copies, not just observed passing: 25/25

**Total: 100/100.**

## Commit

- `smoke.js`: A494 extended (3 new existence checks + rationale addendum), A740 added.
- This manifest.
