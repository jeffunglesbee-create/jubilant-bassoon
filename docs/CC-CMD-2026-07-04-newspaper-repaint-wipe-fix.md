# CC-CMD: Fix #field-newspaper being wiped by 5 direct main.innerHTML bypasses

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Route 5 direct `main.innerHTML=` assignments through the
existing `applyMainHTML()` preservation logic instead of bypassing it.

**Why — real, confirmed bug, not hypothetical:** `applyMainHTML()`
(index.html ~10372) already detaches, preserves, and re-prepends
`#field-newspaper` (the container for "THE MORNING REPORT", "THE TRUTH
IS", and other newspaper sections — confirmed via `renderNewspaper()`,
index.html ~21619) across every `renderAll()`-triggered repaint. Its own
comment states exactly why: "renderAll() calls this function on every
poll/filter/score update and would wipe the newspaper via
replaceChildren." That mechanism is correct and works — but 5 other
code paths set `main.innerHTML` DIRECTLY, completely bypassing it:

1. `renderAll()`'s empty-filter branch (index.html ~10684): fires
   whenever a filter/date combination yields zero games.
2-5. `goToDate()`'s four branches (index.html ~8395-8424): the
   transient "Loading {date}'s schedule…" state, an ESPN-fetch-error
   state, and two "no major events on {date}" empty states — all fire
   during ordinary date navigation.

None of these 5 paths preserve `#field-newspaper`. Confirmed via direct
source read (not assumed): server-side data generation is NOT the
problem — `morning_report` and `truth_is` are two genuinely separate D1
`analytics_output` features, both persisting correctly every day
(verified live 2026-07-04, 11+ consecutive days of real, distinct
content in D1 for `morning_report`; `truth_is` also confirmed separately
persisting with its own distinct content). The bug is entirely
client-side DOM handling: any user action that hits one of these 5
paths (switching to a sport/filter with no current games, navigating to
any other date, even briefly) permanently removes the newspaper banner
from the page until a full reload re-triggers `bootNewspaper()`.

**Target time:** ~20 min (mechanical fix, reuses existing logic)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "function applyMainHTML" index.html
grep -n "main.innerHTML\s*=" index.html
grep -n "function goToDate" index.html
```
Re-confirm all 5 bypass line numbers match this doc before editing —
this file changes daily. If the count is no longer exactly 5, report
the real current count and locations rather than assuming this doc's
list is still complete/accurate.

## TASK 1 — Fix renderAll()'s empty-filter branch

Find (index.html ~10684, re-verify):
```javascript
if(!filtered.length||filtered.every(s=>!(s.games||[]).length)){ main.innerHTML='<div class="empty-note">No '+(freeOnlyFilter?"free ":"")+'events found for this filter</div>'; return; }
```
Replace with (reuse `applyMainHTML`, which already handles this exact
empty-string case and preserves the newspaper):
```javascript
if(!filtered.length||filtered.every(s=>!(s.games||[]).length)){ applyMainHTML('<div class="empty-note">No '+(freeOnlyFilter?"free ":"")+'events found for this filter</div>'); return; }
```

## TASK 2 — Fix goToDate()'s four branches

Find each of the 4 direct `main.innerHTML = ...` assignments inside
`goToDate()` (index.html ~8395-8424, re-verify exact lines) and replace
each with `applyMainHTML(...)` passing the identical template-literal
content, e.g.:
```javascript
// Before:
main.innerHTML = `<div class="empty-note" ...>...</div>`;
// After:
applyMainHTML(`<div class="empty-note" ...>...</div>`);
```
Do this for all 4 occurrences: the "no major events" branch inside the
hardcoded-date path, the "Loading..." transient state, the ESPN-error
state, and the "no major events" branch inside the unknown-date path.
**Do not change any of the HTML content itself** — only the assignment
mechanism (`main.innerHTML = X` → `applyMainHTML(X)`).

## TASK 3 — Smoke assertions

```javascript
smoke.assert(!!html.match(/filtered\.every\(s=>!\(s\.games\|\|\[\]\)\.length\)\)\{\s*applyMainHTML\(/), 'A[NEXT]: renderAll empty-filter branch preserves the newspaper via applyMainHTML');
smoke.assert((html.match(/main\.innerHTML\s*=\s*`<div class="(empty-note|loading-wrap)"/g) || []).length === 0, 'A[NEXT+1]: no remaining direct main.innerHTML bypasses in goToDate — all route through applyMainHTML');
```
(CC: assign real sequential A-numbers. The second assertion is a
regression guard — if a future edit reintroduces a direct bypass, this
should fail. Verify it doesn't false-positive against unrelated
`empty-note`/`loading-wrap` usage elsewhere in the file before trusting
it — read the actual match count first.)

## SCOPE BOUNDARY

DO:
- Convert exactly 5 direct `main.innerHTML=` assignments to `applyMainHTML(...)` calls
- Preserve the exact HTML content of each — only change the assignment mechanism
- 2 smoke assertions
- Bump SW_VERSION

DO NOT:
- Modify `applyMainHTML()` itself — it's already correct, this CC-CMD only routes more callers through it
- Touch any `main.innerHTML` usage outside `renderAll()`'s empty-filter branch and `goToDate()`'s 4 branches — if you find additional bypasses beyond these 5, report them, don't fix them in this pass without confirming scope
- Change what triggers each of these 5 states (filter logic, date-nav logic) — only how the resulting HTML gets applied to the DOM

## DONE CONDITIONS
- [ ] Probe block re-run, exactly 5 bypasses confirmed (or real current count reported if different)
- [ ] All 5 converted to `applyMainHTML(...)` calls, content unchanged
- [ ] Confirmed via code read: `applyMainHTML` itself is untouched
- [ ] `node smoke.js index.html` exits 0 with both new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-newspaper-repaint-wipe-fix-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation that the newspaper banner survives an actual empty-filter or date-navigation action in a live session, and that `#field-newspaper` still contains the same content afterward — code review confirms the mechanism is now consistent, but hasn't been watched happening live.

## COMPLIANCE
- Rule 68: probe block first, re-verify the exact 5 line numbers before editing
- Rule 87: self-completing on the CC-verifiable portion; live behavioral observation is deferred

## CONFIDENCE SCORING TABLE
+40  All 5 bypasses correctly converted, content unchanged, confirmed via diff review
+20  `applyMainHTML` itself confirmed untouched
+20  Smoke 2/2 green (second assertion verified not to false-positive)
+20  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-newspaper-repaint-wipe-fix.md.
Re-confirm all 5 direct main.innerHTML bypass locations first (see
PROBE BLOCK) — report the real current count if it's changed. Convert
each to applyMainHTML(...), preserving content exactly. Do not touch
applyMainHTML itself. Do not commit unless confidence ≥ 95. If score
< 95 report verbatim and stop — do not invent results.
